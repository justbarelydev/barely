/**
 * @justbarely publish - bump, commit, tag (push is manual)
 *
 * Detects workspace packages with changes and walks each one:
 * pick a bump type, write a commit message, and the script bumps the
 * version in package.json, commits the package dir, and tags it -
 * all in ONE commit so the work and the version stay coupled.
 *
 * Usage:
 *   npm run publish           # every changed package
 *   npm run publish -- core   # only the named package(s)
 *
 * Per package:
 *   - bump type: patch (default) / minor / major / skip
 *   - commit message: prefilled "@justbarely/<name>: "
 *     (empty = skip this package, Ctrl-C = bail entirely)
 *
 * Packages that are already committed but untagged get offered as a
 * plain tag (no new commit) - for filling in missed tags.
 *
 * Push is NOT run. After all packages are committed/tagged locally, the
 * script shows a final review (new commits + diff stat) and prints an
 * escape hatch (`git reset --soft <head>` + `git tag -d`). You push
 * manually when the review looks good - nothing leaves the machine until
 * then, so everything stays reversible.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const COLOR = process.stdout.isTTY;

const c = (code, s) => (COLOR ? `\x1b[${code}m${s}\x1b[0m` : s);
const dim = (s) => c('2', s);
const bold = (s) => c('1', s);
const green = (s) => c('32', s);
const yellow = (s) => c('33', s);
const red = (s) => c('31', s);

// ---------------------------------------------------------------------------
// File + git helpers
// ---------------------------------------------------------------------------

function readJson(file) {
	return JSON.parse(readFileSync(file, 'utf8'));
}

function writeJson(file, obj) {
	writeFileSync(file, JSON.stringify(obj, null, '\t') + '\n');
}

function git(args) {
	// trimEnd, not trim: porcelain output lines start with a status column
	// (space = unmodified) - trim() would eat the first line's leading space.
	return execFileSync('git', args, { encoding: 'utf8' }).trimEnd();
}

function gitStatus(dir) {
	const out = git(['status', '--porcelain', '--', dir]);
	return out ? out.split('\n') : [];
}

function listTags(name) {
	const out = git(['tag', '--list', `${name}@*`]);
	return out ? out.split('\n') : [];
}

function latestTag(name) {
	const tags = listTags(name);
	if (!tags.length) return null;
	tags.sort((a, b) => compareVers(verOf(b, name), verOf(a, name)));
	return tags[0];
}

function commitsSince(name, dir) {
	const tag = latestTag(name);
	const args = tag
		? ['log', `${tag}..HEAD`, '--oneline', '--', dir]
		: ['log', '--oneline', '--', dir];
	const out = git(args);
	return out ? out.split('\n') : [];
}

// ---------------------------------------------------------------------------
// Semver (tiny - patch/minor/major + caret satisfaction, no deps)
// ---------------------------------------------------------------------------

function parseVersion(v) {
	const m = /^(\d+)\.(\d+)\.(\d+)/.exec(String(v).trim());
	if (!m) throw new Error(`bad version: ${v}`);
	return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function verOf(tag, name) {
	return tag.slice(name.length + 1);
}

function bumpVersion(v, type) {
	const p = parseVersion(v);
	if (type === 'major') return `${p.major + 1}.0.0`;
	if (type === 'minor') return `${p.major}.${p.minor + 1}.0`;
	return `${p.major}.${p.minor}.${p.patch + 1}`;
}

function compareVers(a, b) {
	const pa = parseVersion(a);
	const pb = parseVersion(b);
	return pa.major - pb.major || pa.minor - pb.minor || pa.patch - pb.patch;
}

/**
 * Does a caret range still satisfy a version after a bump?
 * @returns {boolean|null} true/false, or null if not a simple caret range
 */
function caretSatisfies(range, version) {
	const m = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(String(range).trim());
	if (!m) return null;
	const rmaj = +m[1];
	const rmin = +m[2];
	const rpat = +m[3];
	const v = parseVersion(version);
	if (rmaj > 0) return v.major === rmaj;
	if (rmin > 0) return v.major === 0 && v.minor === rmin;
	return v.major === 0 && v.minor === 0 && v.patch === rpat;
}

/**
 * Update dependent packages' caret ranges when a published package's new
 * version falls outside what the range still allows (e.g. core 0.1.x → 0.2.0
 * breaks engine's `^0.1.0`). Writes the dependent manifests to disk.
 */
function bumpDependentRanges(published, newVersion) {
	const updated = [];
	for (const other of packages) {
		if (other.pkg.name === published.name) continue;
		for (const field of [
			'dependencies',
			'devDependencies',
			'peerDependencies',
			'optionalDependencies',
		]) {
			const deps = other.pkg[field];
			if (!deps || !(published.name in deps)) continue;
			const range = deps[published.name];
			const ok = caretSatisfies(range, newVersion);
			if (ok === false) {
				deps[published.name] = `^${newVersion}`;
				updated.push({ pkg: other, range, to: `^${newVersion}` });
			}
		}
	}
	for (const note of updated) writeJson(note.pkg.file, note.pkg.pkg);
	return updated;
}

// ---------------------------------------------------------------------------
// Interactive prompts
// ---------------------------------------------------------------------------

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(q) {
	return new Promise((resolve) => rl.question(q, (a) => resolve(a.trim())));
}

// Editable prefill: types the default into the buffer so the user can
// backspace/edit it before pressing Enter. TTY only - prefill is meaningless
// (and harmful) when stdin is piped.
function askPrefilled(q, prefill) {
	return new Promise((resolve) => {
		rl.question(q, (a) => resolve(a.trim()));
		if (process.stdin.isTTY) {
			try {
				rl.write(prefill);
			} catch {
				// fall through - no prefill
			}
		}
	});
}

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------

const rootPkg = readJson(join(ROOT, 'package.json'));
const packages = (rootPkg.workspaces || [])
	.map((p) => resolve(ROOT, p))
	.filter((dir) => existsSync(join(dir, 'package.json')))
	.map((dir) => {
		const file = join(dir, 'package.json');
		return { dir, file, pkg: readJson(file) };
	});

function hasUncommitted(p) {
	return gitStatus(p.dir).length > 0;
}

function isVersionTagged(p) {
	return listTags(p.pkg.name).includes(`${p.pkg.name}@${p.pkg.version}`);
}

function isChanged(p) {
	// Uncommitted work in the dir, or a package.json version with no matching
	// tag (a version bump that was committed but never tagged). Historical
	// untagged commits don't count - if the current version is tagged, there's
	// nothing pending.
	return hasUncommitted(p) || !isVersionTagged(p);
}

async function main() {
	const filter = process.argv.slice(2);
	let candidates = packages.filter(isChanged);
	if (filter.length) {
		candidates = candidates.filter((p) =>
			filter.some(
				(f) =>
					f === p.pkg.name ||
					f === p.pkg.name.replace(/^@justbarely\//, ''),
			),
		);
	}

	if (!candidates.length) {
		console.log('No workspace packages have changes to publish.');
		rl.close();
		return;
	}

	console.log(bold('\nPackages with changes:'));
	for (const p of candidates) {
		console.log(`  ${p.pkg.name}  ${dim(`v${p.pkg.version}`)}`);
	}
	console.log('');

	const startHead = git(['rev-parse', '--short', 'HEAD']);
	const published = [];

	for (const p of candidates) {
		const uncommitted = hasUncommitted(p);
		const commits = commitsSince(p.pkg.name, p.dir);
		const lastTag = latestTag(p.pkg.name);

		console.log(bold(`=== ${p.pkg.name} ===`));
		console.log(`  version: ${p.pkg.version}`);

		if (!uncommitted) {
			// Work is already committed but untagged - just offer to tag HEAD.
			const tagName = `${p.pkg.name}@${p.pkg.version}`;
			if (listTags(p.pkg.name).includes(tagName)) {
				const n = commits.length;
				console.log(
					yellow(
						`  already tagged ${tagName}${n ? ` - ${n} commit(s) untagged since last release` : ''} - nothing to do`,
					),
				);
				continue;
			}
			console.log(
				`  ${commits.length} commit(s) since ${dim(lastTag || 'the beginning')}:`,
			);
			for (const c of commits.slice(0, 5)) console.log(`    ${dim(c)}`);
			const ans = await ask(
				`  tag HEAD as ${bold(tagName)}? ${dim('[y/N]')}: `,
			);
			if (/^y/i.test(ans)) {
				git(['tag', tagName]);
				published.push({
					p,
					newVersion: p.pkg.version,
					hash: 'HEAD',
					tag: tagName,
				});
				console.log(`  ${green(`✓ tagged ${tagName}`)}`);
			} else {
				console.log('  skipped');
			}
			continue;
		}

		// Full flow - uncommitted work in the package dir.
		const files = gitStatus(p.dir)
			.map((s) => s.slice(3))
			.filter(Boolean);
		console.log(`  changed: ${files.join(', ')}`);
		if (commits.length) {
			console.log(
				`  + ${commits.length} commit(s) since ${dim(lastTag || 'the beginning')}`,
			);
		}

		const bumpAns = await ask(
			`  bump ${dim('[patch|minor|major|skip]')} ${dim('(enter=patch)')}: `,
		);
		if (/^s/i.test(bumpAns)) {
			console.log('  skipped');
			continue;
		}
		const type = /^major/i.test(bumpAns)
			? 'major'
			: /^minor/i.test(bumpAns)
				? 'minor'
				: 'patch';
		const newVersion = bumpVersion(p.pkg.version, type);
		console.log(`  new version: ${bold(newVersion)}`);

		const message = await askPrefilled(
			'  commit message: ',
			`${p.pkg.name}: `,
		);
		if (!message) {
			console.log('  skipped (empty message)');
			continue;
		}

		// Bump this package + any dependents whose ranges no longer resolve.
		const oldVersion = p.pkg.version;
		p.pkg.version = newVersion;
		writeJson(p.file, p.pkg);
		const rangeNotes = bumpDependentRanges(p.pkg, newVersion);
		for (const note of rangeNotes) {
			console.log(
				`  ${yellow('⚠')} ${note.pkg.pkg.name} depends on ${p.pkg.name}: ${dim(note.range)} → ${note.to}`,
			);
		}

		// One commit carries the work + the version bump.
		git(['add', '--', p.dir]);
		git(['commit', '-m', message]);
		const hash = git(['rev-parse', '--short', 'HEAD']);
		const tagName = `${p.pkg.name}@${newVersion}`;
		git(['tag', tagName]);
		published.push({ p, oldVersion, newVersion, hash, tag: tagName });
		console.log(`  ${green(`✓ committed ${hash} + tagged ${tagName}`)}`);
	}

	// Final review + escape hatch. Everything is still local - push is manual.
	if (published.length) {
		const newCommits = git(['log', '--oneline', `${startHead}..HEAD`]);
		const diffStat = git(['diff', '--stat', `${startHead}..HEAD`]);
		const remaining = git(['status', '--short']);
		const tags = published.map((x) => x.tag);

		console.log(bold('\nPublished (all local - nothing pushed yet):'));
		for (const { p, oldVersion, newVersion, hash, tag } of published) {
			console.log(
				`  ${p.pkg.name}  ${oldVersion ? `${dim(oldVersion)} → ` : ''}${bold(newVersion)}  ${dim(`(${hash}, ${tag})`)}`,
			);
		}

		console.log(bold('\nFinal review:'));
		console.log(dim(`  New commits since ${startHead}:`));
		if (newCommits)
			for (const line of newCommits.split('\n')) console.log(`  ${line}`);
		if (diffStat) {
			console.log(dim('\n  What changed:'));
			for (const line of diffStat.split('\n')) console.log(`  ${line}`);
		}
		if (remaining) {
			console.log(dim('\n  Still uncommitted (left alone):'));
			for (const line of remaining.split('\n')) console.log(`  ${line}`);
		}

		console.log(
			dim(
				'\n  Escape hatch - undo everything (still local, fully reversible):',
			),
		);
		console.log(dim(`  git reset --soft ${startHead}`));
		console.log(dim(`  git tag -d ${tags.join(' ')}`));

		console.log('\nPush when the review looks good:');
		console.log(green('  git push && git push --tags'));
	} else {
		console.log(dim('\nNothing was committed or tagged this run.'));
	}

	rl.close();
}

main().catch((err) => {
	console.error(red(`\n${err.message}`));
	process.exit(1);
});
