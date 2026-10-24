/**
 * 迷你 ANSI 终端屏幕模拟器
 * ------------------------------------------------------------
 * 同学们的作品经常用 \033[H（光标归位）、\033[2J（清屏）逐帧重绘动画，
 * 真终端里这是"覆盖刷新"，而朴素的 ansi-to-html 会把所有帧堆叠成一坨。
 *
 * 本模块在内存里维护一张字符网格，逐个解释转义序列：
 * - 一次性用法（ansiToHtml）：只渲染终态画面，等价于终端停止刷新后的那一帧；
 * - 增量用法（createScreen().write(chunk)）：边跑边喂，随时取当前画面，
 *   于是逐帧动画可以在网页里"一个一个显现"。
 *
 * 支持：LF / CR / TAB、CUP(H,f)、CUU/CUD/CUF/CUB(A~D)、ED(J)、EL(K)、
 *       SGR（0 复位、30-37/90-97 前景、40-47/100-107 背景、38;5 与 38;2 真彩色、1 粗体、3 斜体、39/49 默认）
 * 忽略：私有模式（?25l 光标、?1049 备用屏）、OSC 序列
 */

const MAX_ROWS = 2000;
const MAX_COLS = 1000;

/**
 * 创建一张可增量写入的屏幕。
 * @returns {{
 *   write: (chunk: string) => void,
 *   grid: () => { rows: Map<number, {ch:string,s:number}>[], styles: string[] },
 *   toHtml: () => string,
 *   reset: () => void,
 * }}
 */
export function createScreen() {
  const styles = [''];
  const styleIndex = new Map([['', 0]]);

  // 光栅：rows[r] 为 Map<col, {ch, s}>，天然稀疏、按需扩行
  let rows = [];
  let row = 0;
  let col = 0;
  let cur = ''; // 当前 SGR 样式串，如 "color:#39d353;font-weight:700"
  let stash = ''; // 上一块末尾没写完的转义序列，下次 write 前拼回去

  const styleOf = (style) => {
    let i = styleIndex.get(style);
    if (i === undefined) {
      i = styles.length;
      styles.push(style);
      styleIndex.set(style, i);
    }
    return i;
  };

  const ensureRow = (r) => {
    if (!rows[r]) rows[r] = new Map();
    return rows[r];
  };

  const clearRow = (r) => {
    if (rows[r]) rows[r] = new Map();
  };

  const applySgr = (params) => {
    const p = params.length ? params : [0];
    for (let i = 0; i < p.length; i++) {
      const v = p[i];
      if (v === 0) {
        cur = '';
        continue;
      }
      if (v === 1) {
        cur = append(cur, 'font-weight:700');
        continue;
      }
      if (v === 3) {
        cur = append(cur, 'font-style:italic');
        continue;
      }
      if (v === 39) {
        cur = removeColor(cur, 'color');
        continue;
      }
      if (v === 49) {
        cur = removeColor(cur, 'background-color');
        continue;
      }
      if ((v >= 30 && v <= 37) || (v >= 90 && v <= 97)) {
        cur = setColor(cur, 'color', BASIC_FG[v]);
        continue;
      }
      if ((v >= 40 && v <= 47) || (v >= 100 && v <= 107)) {
        cur = setColor(cur, 'background-color', BASIC_BG[v]);
        continue;
      }
      if ((v === 38 || v === 48) && i + 1 < p.length) {
        const kind = p[i + 1];
        let css = null;
        if (kind === 5 && i + 2 < p.length) {
          css = xterm256(p[i + 2]);
          i += 2;
        } else if (kind === 2 && i + 4 < p.length) {
          const r = clampByte(p[i + 2]);
          const g = clampByte(p[i + 3]);
          const b = clampByte(p[i + 4]);
          css = `rgb(${r},${g},${b})`;
          i += 4;
        }
        if (css) {
          cur = setColor(cur, v === 38 ? 'color' : 'background-color', css);
        }
        continue;
      }
      // 其余（下划线/反转/闪烁等）按无样式处理，不报错
    }
  };

  function write(chunk) {
    const text = stash + String(chunk ?? '');
    stash = '';
    const len = text.length;
    let i = 0;

    while (i < len) {
      const ch = text[i];

      // ANSI 转义
      if (ch === '\x1b') {
        const next = text[i + 1];

        // 分块切断：单独的 ESC 留到下一块
        if (next === undefined) {
          stash = text.slice(i);
          return;
        }

        // OSC：跳到 BEL 或 ST
        if (next === ']') {
          let j = i + 2;
          while (j < len && text[j] !== '\x07' && !(text[j] === '\x1b' && text[j + 1] === '\\')) j++;
          if (j >= len) {
            stash = text.slice(i); // 序列没结束，等下一块
            return;
          }
          i = text[j] === '\x1b' ? j + 2 : j + 1;
          continue;
        }

        if (next !== '[') {
          i += 2; // 其他双字符转义，忽略
          continue;
        }

        // CSI：读取参数直到终结字母
        let j = i + 2;
        while (j < len && !/[A-Za-z]/.test(text[j])) j++;
        if (j >= len) {
          stash = text.slice(i); // 序列没结束，等下一块
          return;
        }
        const body = text.slice(i + 2, j);
        const final = text[j];
        i = j + 1;

        const isPrivate = body.startsWith('?');
        const params = body
          .replace(/^\?/, '')
          .split(';')
          .filter((s) => s !== '')
          .map((s) => {
            const n = parseInt(s, 10);
            return Number.isFinite(n) ? n : 0;
          });
        const p0 = params.length ? params[0] : 0;

        switch (final) {
          case 'H':
          case 'f': {
            row = Math.min(Math.max((params[0] || 1) - 1, 0), MAX_ROWS - 1);
            col = Math.min(Math.max((params[1] || 1) - 1, 0), MAX_COLS - 1);
            ensureRow(row);
            break;
          }
          case 'A':
            row = Math.max(row - Math.max(p0, 1), 0);
            break;
          case 'B':
            row = Math.min(row + Math.max(p0, 1), MAX_ROWS - 1);
            ensureRow(row);
            break;
          case 'C':
            col = Math.min(col + Math.max(p0, 1), MAX_COLS - 1);
            break;
          case 'D':
            col = Math.max(col - Math.max(p0, 1), 0);
            break;
          case 'E':
            row = Math.min(row + Math.max(p0, 1), MAX_ROWS - 1);
            col = 0;
            ensureRow(row);
            break;
          case 'F':
            row = Math.max(row - Math.max(p0, 1), 0);
            col = 0;
            break;
          case 'G':
            col = Math.min(Math.max(p0 - 1, 0), MAX_COLS - 1);
            break;
          case 'J': {
            if (p0 === 2 || isPrivate) {
              rows = [];
              row = 0;
              col = 0;
            } else if (p0 === 0) {
              const r0 = ensureRow(row);
              for (let c = col; c < MAX_COLS; c++) r0.delete(c);
              for (let r = row + 1; r < rows.length; r++) clearRow(r);
            } else if (p0 === 1) {
              const r0 = ensureRow(row);
              for (let c = 0; c <= col; c++) r0.delete(c);
            }
            break;
          }
          case 'K': {
            const r0 = ensureRow(row);
            if (p0 === 0 || params.length === 0) {
              for (let c = col; c < MAX_COLS; c++) r0.delete(c);
            } else if (p0 === 1) {
              for (let c = 0; c <= col; c++) r0.delete(c);
            } else {
              clearRow(row);
            }
            break;
          }
          case 'm':
            applySgr(params);
            break;
          default:
            break; // s/q/h/l/L/M/P/S/T 等忽略
        }
        continue;
      }

      // 控制字符
      if (ch === '\n') {
        row = Math.min(row + 1, MAX_ROWS - 1);
        col = 0;
        ensureRow(row);
        i++;
        continue;
      }
      if (ch === '\r') {
        col = 0;
        i++;
        continue;
      }
      if (ch === '\t') {
        col = Math.min((Math.floor(col / 8) + 1) * 8, MAX_COLS - 1);
        i++;
        continue;
      }
      if (ch === '\b') {
        col = Math.max(col - 1, 0);
        i++;
        continue;
      }
      if (ch < ' ') {
        i++; // 其余控制字符忽略
        continue;
      }

      // 可打印字符
      const grid = ensureRow(row);
      grid.set(col, { ch, s: styleOf(cur) });
      col = Math.min(col + 1, MAX_COLS - 1);
      i++;
    }
  }

  return {
    write,
    grid: () => ({ rows, styles }),
    toHtml: () => gridToHtml({ rows, styles }),
    reset: () => {
      rows = [];
      row = 0;
      col = 0;
      cur = '';
      stash = '';
    },
  };
}

/** 兼容用法：一次性把整段 ANSI 文本解释成屏幕网格 */
export function ansiToGrid(raw) {
  const screen = createScreen();
  screen.write(raw);
  return screen.grid();
}

/** 把网格渲染成 HTML：按行分组同样式 span，行内空格用真实空格（配合 pre 展示） */
export function gridToHtml(grid) {
  const { rows, styles } = grid;

  // 裁掉末尾整行空行
  let end = rows.length;
  while (end > 0 && (!rows[end - 1] || rows[end - 1].size === 0)) end--;

  const out = [];
  for (let r = 0; r < end; r++) {
    const cells = rows[r];
    if (!cells || cells.size === 0) {
      out.push('');
      continue;
    }
    let line = '';
    let lastCol = -1;
    let lastStyle = -1;
    let buf = '';

    const flush = () => {
      if (!buf) return;
      const style = styles[lastStyle] || '';
      line += style ? `<span style="${escapeAttr(style)}">${escapeHtml(buf)}</span>` : escapeHtml(buf);
      buf = '';
    };

    for (const [c, cell] of [...cells.entries()].sort((a, b) => a[0] - b[0])) {
      if (lastCol >= 0) {
        // 补上中间被清掉/跳过的空格
        for (let k = lastCol + 1; k < c; k++) buf += ' ';
      }
      if (cell.s !== lastStyle) flush();
      lastCol = c;
      lastStyle = cell.s;
      buf += cell.ch;
    }
    flush();
    out.push(line);
  }
  return out.join('\n');
}

/** 总入口：ANSI 文本 → 最终画面 HTML */
export function ansiToHtml(raw) {
  const screen = createScreen();
  screen.write(raw);
  return screen.toHtml();
}

/** 是否包含"需要模拟器"的光标/清屏/擦除指令 */
export function needsScreenEmulation(raw) {
  return /\x1b\[[0-9;?]*[HJKABCEFGf]/.test(String(raw ?? ''));
}

/* ---------------- 内部工具 ---------------- */

const BASIC_FG = {
  30: '#666', 31: '#ef7f76', 32: '#3fbf7f', 33: '#d9a441',
  34: '#6a9ef7', 35: '#c586c0', 36: '#3fd0a8', 37: '#e8e9ec',
  90: '#82848a', 91: '#ff8f88', 92: '#5bd898', 93: '#f0bd62',
  94: '#8ab4ff', 95: '#d7a7f0', 96: '#63e2c6', 97: '#ffffff',
};
const BASIC_BG = {
  40: '#2a2c32', 41: '#8c3f3a', 42: '#2c6e49', 43: '#8a6d2f',
  44: '#3b5b9e', 45: '#7a4d8f', 46: '#2f7a68', 47: '#55575e',
  100: '#4a4c55', 101: '#b4605a', 102: '#4f9e73', 103: '#c9a44c',
  104: '#6d8fd6', 105: '#a876c0', 106: '#54b79e', 107: '#c8c9ce',
};

const clampByte = (n) => Math.min(Math.max(n | 0, 0), 255);

function xterm256(n) {
  if (n < 8) return BASIC_FG[30 + n] || '#e8e9ec';
  if (n < 16) return BASIC_FG[90 + (n - 8)] || '#e8e9ec';
  if (n < 232) {
    const idx = n - 16;
    const steps = [0, 95, 135, 175, 215, 255];
    const r = steps[Math.floor(idx / 36)];
    const g = steps[Math.floor((idx % 36) / 6)];
    const b = steps[idx % 6];
    return `rgb(${r},${g},${b})`;
  }
  const v = 8 + (n - 232) * 10;
  return `rgb(${v},${v},${v})`;
}

function append(style, decl) {
  return style ? `${style};${decl}` : decl;
}

function setColor(style, prop, css) {
  const without = removeColor(style, prop);
  return without ? `${without};${prop}:${css}` : `${prop}:${css}`;
}

function removeColor(style, prop) {
  if (!style) return '';
  return style
    .split(';')
    .filter((d) => d && !d.startsWith(`${prop}:`))
    .join(';');
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
