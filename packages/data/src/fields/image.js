import { colorFromSeed, randomInt, initials } from '../helpers';

function makeSVG({ width, height, bg, fg, text }) {
	const fontSize = Math.min(width, height) * 0.12;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${bg}"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        font-family="sans-serif" font-size="${fontSize}" fill="${fg}">${text}</text>
</svg>`;
}

/** Generate a placeholder image */
export function placeholder({ width, height, bg, fg, text, seed } = {}) {
	const w = Number(width) || randomInt(100, 800);
	const h = Number(height) || randomInt(100, 800);
	const s = seed || `img_${randomInt(1, 9999)}`;
	return makeSVG({
		width: w,
		height: h,
		bg: bg || '#' + colorFromSeed(s),
		fg: fg || '#333333',
		text: text || `${w}x${h}`,
	});
}

export function avatar({ first, last, size = 80, bg, fg, seed } = {}) {
	const s = seed || `av_${first}_${last}`;
	const svg = makeSVG({
		width: size,
		height: size,
		bg: bg || '#' + colorFromSeed(s),
		fg: fg || '#ffffff',
		text: initials(first, last) || '?',
	});
	return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
