import { randomInt, pick } from '../helpers';
import { letters } from '../seeds';

/** @returns {string} An SVG element with centered text inside a foreignObject */
function makeSVG({ width, height, bg, fg, text }) {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${bg}"/>
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml"
         style="width:100%;height:100%;
		 display:flex; align-items:center; justify-content:center;
		 font-family:system-ui, sans-serif; color:${fg}; line-height:1.2;
		 container-type:inline-size; font-size:clamp(24px,12cqi,64px);
		 text-align:center; word-break:break-word;
		 box-sizing:border-box; padding:12px; overflow:hidden;"
	>
      ${text}
    </div>
  </foreignObject>
</svg>`;
}

/** @returns {string} An inline SVG data URI */
export function image(opts = {}) {
	const { width, height, bg, fg, text } = opts;
	const w = Number(width) || randomInt(100, 800);
	const h = Number(height) || randomInt(100, 800);
	return makeSVG({
		width: w,
		height: h,
		bg: bg || '#e2e8f0',
		fg: fg || '#94a3b8',
		text: text || `${w}x${h}`,
	});
}

/** @returns {string} An inline SVG data URI with initials or text */
export function avatar(opts = {}) {
	const { size = 80, bg, fg, text } = opts;
	const svg = makeSVG({
		width: size,
		height: size,
		bg: bg || '#e2e8f0',
		fg: fg || '#94a3b8',
		text: text || `${pick(letters)}${pick(letters)}`,
	});
	return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
