import { randomInt, pick } from '../helpers';
import { letters } from '../seeds';

function makeSVG({ width, height, bg, fg, text }) {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${bg}"/>
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml"
         style="width:100%;height:100%;
                display:flex;align-items:center;justify-content:center;
                container-type:inline-size;
                font-family:system-ui, sans-serif;font-size:clamp(24px,12cqi,64px);color:${fg};line-height:1.2;
                box-sizing:border-box;padding:12px;
                text-align:center;overflow:hidden;word-break:break-word">
      ${text}
    </div>
  </foreignObject>
</svg>`;
}

/** Generate a placeholder image */
export function image({ width, height, bg, fg, text } = {}) {
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

export function avatar({ size = 80, bg, fg, text } = {}) {
	const svg = makeSVG({
		width: size,
		height: size,
		bg: bg || '#e2e8f0',
		fg: fg || '#94a3b8',
		text: text || `${pick(letters)}${pick(letters)}`,
	});
	return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
