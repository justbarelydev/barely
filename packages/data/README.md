# @barely/data

Add placeholder data to HTML with data attributes.

## Usage

```html
<script src="https://unpkg.com/@barely/data/dist/index.js"></script>

<span data-random-name></span>
<!-- Maria Garcia -->

<span data-random-price="10-100"></span>
<!-- $47 -->

<span data-random-paragraph="2"></span>
<!-- <p>Lorem ipsum...</p><p>Dolor sit amet...</p> -->
```

Auto-populates on load. MutationObserver handles dynamically added elements.

## Fields

| Attribute                     | Returns          | Example                            |
| ----------------------------- | ---------------- | ---------------------------------- |
| `data-random-name`            | Full name        | Maria Garcia                       |
| `data-random-first-name`      | First name       | Maria                              |
| `data-random-last-name`       | Last name        | Garcia                             |
| `data-random-email`           | Email address    | maria.garcia@gmail.com             |
| `data-random-job`             | Job title        | Software Engineer                  |
| `data-random-phone`           | Phone number     | 503-555-0199                       |
| `data-random-website`         | Website URL      | https://mariagarcia.com            |
| `data-random-username`        | Username         | mariagarcia42                      |
| `data-random-price`           | Price with cents | $149.73                            |
| `data-random-price="10-100"`  | Price in range   | $47.52                             |
| `data-random-rating`          | Rating + stars   | 4 ★★★★☆                            |
| `data-random-rating="number"` | Rating only      | 4                                  |
| `data-random-rating="stars"`  | Stars only       | ★★★★☆                              |
| `data-random-in-stock`        | In stock status  | ✓ or ✗                             |
| `data-random-sku`             | Product SKU      | B482031                            |
| `data-random-category`        | Product category | Accessories                        |
| `data-random-words="8"`       | Random words     | lorem ipsum dolor sit amet         |
| `data-random-sentence`        | Sentence         | Lorem ipsum dolor sit amet...      |
| `data-random-paragraph`       | Paragraph (1)    | <p>Lorem ipsum...</p>              |
| `data-random-paragraph="3"`   | N paragraphs     | <p>...</p><p>...</p><p>...</p>     |
| `data-random-number`          | Integer 0-1000   | 437                                |
| `data-random-number="1-6"`    | Integer in range | 4                                  |
| `data-random-float="0-100"`   | Float in range   | 37.52                              |
| `data-random-boolean`         | true / false     | true                               |
| `data-random-company-name`    | Company name     | Quantum Ventures                   |
| `data-random-catch-phrase`    | Company tagline  | Leverage synergistic paradigms     |
| `data-random-street`          | Street address   | 742 Elm St                         |
| `data-random-city`            | City             | Portland                           |
| `data-random-state`           | State            | Oregon                             |
| `data-random-zip-code`        | Zip code         | 97201                              |
| `data-random-address`         | Full address     | 742 Elm St, Portland, Oregon 97201 |
| `data-random-image`           | Placeholder SVG  | data:image/svg+xml,...             |
| `data-random-avatar`          | Avatar SVG       | data:image/svg+xml,...             |

## Companion attrs

### Images

Used alongside `data-random-image` or `data-random-avatar`.

```html
<img data-random-image data-bg="#2563eb" data-fg="#ffffff" data-text="Demo" />
<img data-random-avatar width="40" height="40" />
```

| Attr        | Default            | Notes               |
| ----------- | ------------------ | ------------------- |
| `data-bg`   | `#e2e8f0`          | Any CSS color value |
| `data-fg`   | `#94a3b8`          | Any CSS color value |
| `data-text` | `{width}x{height}` | Overlay text        |

### Decimals

Used alongside `data-random-price`, `data-random-number`, or `data-random-float` to control decimal precision.

```html
<span data-random-price="1-20" data-decimals="0">$47</span>
<span data-random-price="1-20" data-decimals="3">$47.523</span>
<span data-random-number="0-1" data-decimals="4">0.4723</span>
<span data-random-float="0-100" data-decimals="0">37</span>
```

| data-decimals | Result               |
| ------------- | -------------------- |
| (unset)       | Default (2 for most) |
| `"0"`         | Integer              |
| `"3"`         | 3 decimal places     |

## Delimiters

Single value — fixed:

```html
<span data-random-words="8"></span> <span data-random-number="42"></span>
```

Range — use `-` or `,`:

```html
<span data-random-price="10-100"></span>
<span data-random-price="10,100"></span>
```

## Programmatic

Each field is also an importable function:

```js
import { fullName, email, price } from '@barely/data';

fullName(); // "Maria Garcia"
email(); // "maria.garcia@gmail.com"
price(); // "149.73"
price({ min: 10, max: 20 }); // "17.52"
price({ min: 10, max: 20, decimals: 0 }); // "17"
```

Works anywhere — Node scripts, React components, whatever:

```jsx
import { fullName, email, avatar } from '@barely/data';

function UserCard({ user }) {
	return (
		<div>
			<img
				src={avatar({ first: user?.firstName, last: user?.lastName })}
			/>
			<h3>{user?.name ?? fullName()}</h3>
			<p>{user?.email ?? email()}</p>
		</div>
	);
}
```

## Build

```sh
npm run build -w packages/data
# → dist/index.js (9.8KB minified)
```
