/**
 * 界面开关
 * ------------------------------------------------------------
 * 预览区工具图标（复制 / 放大）在桌面端默认「悬停才出现」，触屏设备本来就常显。
 * 想对比两种观感时不用改代码：
 *   ?tools=always  强制常显（测遮挡）
 *   ?tools=hover   强制悬停（测可发现性）
 * 定稿后把常量写成最终值、删掉 URL 覆盖即可。
 */
const params = new URLSearchParams(window.location.search);

export const TOOLS_ALWAYS_VISIBLE = params.get('tools') === 'always';

/**
 * 移动端点"全屏"时会请求浏览器真全屏（顺带尝试锁横屏）。
 * 但开发者工具的设备模拟模式里 pointer 也是 coarse，桌面调试时会被一起触发；
 * 想安静地测遮罩层就加 ?nativefs=0。
 */
export const NATIVE_FULLSCREEN = params.get('nativefs') !== '0';
