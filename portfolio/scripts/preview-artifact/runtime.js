/*
 * Preview runtime: reproduces the portfolio's interactions on the static
 * snapshot built by build.mjs (no Next.js, no network). Kept dependency-free.
 */
(() => {
	'use strict';
	const ASSETS = JSON.parse(document.getElementById('preview-assets').textContent);
	const CONFIG = JSON.parse(document.getElementById('preview-config').textContent);
	const html = document.documentElement;
	const $ = (sel, root = document) => root.querySelector(sel);
	const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
	// CSS-module classes look like "Name-module__hash__part"; match the part exactly.
	const hasPart = (el, name, part) =>
		Array.from(el.classList).some((c) => c.startsWith(`${name}-module__`) && c.endsWith(`__${part}`));
	const mods = (name, part, root = document) =>
		$$(`[class*="${name}-module__"]`, root).filter((el) => hasPart(el, name, part));
	const mod = (name, part, root) => mods(name, part, root)[0] ?? null;
	const swapPart = (el, from, to) =>
		Array.from(el.classList)
			.find((c) => c.endsWith(`__${from}`))
			?.replace(new RegExp(`__${from}$`), `__${to}`);
	const reduced = matchMedia('(prefers-reduced-motion: reduce)');
	const fine = matchMedia('(hover: hover) and (pointer: fine)');
	const store = {
		get: (k) => {
			try {
				return localStorage.getItem(k);
			} catch {
				return null;
			}
		},
		set: (k, v) => {
			try {
				localStorage.setItem(k, v);
			} catch {
				/* unavailable */
			}
		},
	};
	let paused = store.get('motion-paused') === '1';
	const allowAutoplay = () => !reduced.matches && !paused;
	const allowPointer = () => !reduced.matches && fine.matches;
	const syncMotionAttr = () => (html.dataset.motion = allowAutoplay() ? 'running' : 'paused');
	syncMotionAttr();

	const view = document.getElementById('view');
	const top = $('[data-menu-inert]');
	const header = $('header', top);
	const menuRoot = $('[class*="MenuDrawer-module__"][class*="__root"]');
	let routeCtl = new AbortController();
	let current = null;

	const fillAssets = (root) =>
		$$('img[data-asset]', root).forEach((img) => {
			const src = ASSETS[img.dataset.asset];
			if (src) img.src = src;
		});
	fillAssets(document);

	// ---------------------------------------------------------------- router
	function routeFromHash() {
		const h = location.hash.slice(1);
		if (!h || h === 'main') return 'home';
		return CONFIG.routes.includes(h) ? h : 'notfound';
	}

	function navLinkActive(href, route) {
		const target = href.replace('#', '');
		if (target === 'home') return route === 'home';
		if (target === 'work') return route === 'work' || route.startsWith('p-');
		return target === route;
	}

	function render(route) {
		routeCtl.abort();
		routeCtl = new AbortController();
		const tpl = document.getElementById(`route-${route}`);
		view.replaceChildren(tpl.content.cloneNode(true));
		document.title = tpl.dataset.title;
		header.dataset.theme = route === 'home' || route === 'contact' ? 'light' : 'dark';
		$$('a[href^="#"]', top)
			.concat($$('nav a[href^="#"]', menuRoot))
			.forEach((a) => {
				if (navLinkActive(a.getAttribute('href'), route)) a.setAttribute('aria-current', 'page');
				else a.removeAttribute('aria-current');
			});
		fillAssets(view);
		const signal = routeCtl.signal;
		initMarquee(signal);
		initMotionToggle(signal);
		initMagnetic(view, signal);
		initLists(signal);
		initWorkIndex(signal);
		initVideo(signal);
		initLocalTime(signal);
		initForm(signal);
		initReveal(signal);
		current = route;
	}

	function go(first) {
		const route = routeFromHash();
		if (route === current) return;
		closeMenu(false);
		const swap = () => {
			render(route);
			window.scrollTo(0, 0);
		};
		if (!first && document.startViewTransition && !reduced.matches) document.startViewTransition(swap);
		else swap();
		if (!first) $('#main', view)?.focus({ preventScroll: true });
	}

	addEventListener('hashchange', () => {
		if (location.hash === '#main') return;
		go(false);
	});
	$('.skip-link').addEventListener('click', (e) => {
		e.preventDefault();
		$('#main', view)?.focus();
	});

	// ------------------------------------------------------------------ menu
	const trigger = mod('MenuDrawer', 'trigger', menuRoot);
	const drawer = $('nav', menuRoot);
	const overlay = mod('MenuDrawer', 'overlay', menuRoot);
	const headerMenuButton = mod('SiteHeader', 'menuButton', top);
	let menuOpen = false;
	let returnFocus = null;
	let scrolled = false;

	function syncTrigger() {
		const show = scrolled || menuOpen;
		if (show) trigger.dataset.visible = 'true';
		else delete trigger.dataset.visible;
		trigger.inert = !show;
	}
	function openMenu(from) {
		if (menuOpen) return;
		menuOpen = true;
		returnFocus = from;
		menuRoot.dataset.open = 'true';
		html.dataset.menuOpen = '';
		trigger.setAttribute('aria-expanded', 'true');
		trigger.setAttribute('aria-label', 'Close menu');
		headerMenuButton?.setAttribute('aria-expanded', 'true');
		drawer.inert = false;
		top.inert = true;
		view.inert = true;
		syncTrigger();
		dispatchEvent(new Event('menu:open'));
		$('a', drawer)?.focus({ preventScroll: true });
	}
	function closeMenu(restore = true) {
		if (!menuOpen) return;
		menuOpen = false;
		delete menuRoot.dataset.open;
		delete html.dataset.menuOpen;
		trigger.setAttribute('aria-expanded', 'false');
		trigger.setAttribute('aria-label', 'Open menu');
		headerMenuButton?.setAttribute('aria-expanded', 'false');
		drawer.inert = true;
		top.inert = false;
		view.inert = false;
		syncTrigger();
		if (restore && returnFocus && returnFocus.getClientRects().length) returnFocus.focus();
	}
	trigger.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu(trigger)));
	headerMenuButton?.addEventListener('click', () => openMenu(headerMenuButton));
	overlay.addEventListener('click', () => closeMenu());
	$$('a', drawer).forEach((a) =>
		a.addEventListener('click', () => {
			if (
				a.getAttribute('href') === `#${current}` ||
				(a.getAttribute('href') === '#home' && current === 'home')
			)
				closeMenu(false);
		}),
	);
	document.addEventListener('keydown', (e) => {
		if (!menuOpen) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			closeMenu();
		} else if (e.key === 'Tab') {
			const items = [trigger, ...$$('a', drawer)];
			const i = items.indexOf(document.activeElement);
			if (e.shiftKey && i <= 0) {
				e.preventDefault();
				items[items.length - 1].focus();
			} else if (!e.shiftKey && i === items.length - 1) {
				e.preventDefault();
				items[0].focus();
			}
		}
	});
	new IntersectionObserver(([entry]) => {
		scrolled = !entry.isIntersecting && entry.boundingClientRect.top < 0;
		syncTrigger();
	}).observe(document.getElementById('scroll-sentinel'));

	// --------------------------------------------------------------- marquee
	function initMarquee(signal) {
		const track = mod('NameMarquee', 'track', view);
		if (!track) return;
		const copy = track.firstElementChild;
		let x = 0;
		let dir = -1;
		let boost = 0;
		let visible = true;
		let last = performance.now();
		let lastY = scrollY;
		let raf = 0;
		const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
		io.observe(track);
		const tick = (t) => {
			raf = requestAnimationFrame(tick);
			const dt = Math.min(t - last, 64);
			last = t;
			if (!visible || !allowAutoplay() || document.hidden) return;
			const w = copy.offsetWidth;
			if (!w) return;
			x += dir * (w / 24) * (1 + boost) * (dt / 1000);
			boost *= 0.92;
			if (x <= -w) x += w;
			if (x > 0) x -= w;
			track.style.transform = `translate3d(${x}px,0,0)`;
		};
		raf = requestAnimationFrame(tick);
		addEventListener(
			'scroll',
			() => {
				const d = scrollY - lastY;
				lastY = scrollY;
				if (d) dir = d > 0 ? -1 : 1;
				boost = Math.min(4, boost + Math.abs(d) * 0.06);
			},
			{ passive: true, signal },
		);
		signal.addEventListener('abort', () => {
			cancelAnimationFrame(raf);
			io.disconnect();
		});
	}

	const PAUSE =
		'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="14" height="14"><rect x="6" y="5" width="4" height="14"></rect><rect x="14" y="5" width="4" height="14"></rect></svg>';
	const PLAY =
		'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="14" height="14"><path d="M7 4.5v15l12-7.5z"></path></svg>';
	function initMotionToggle() {
		const btn = mod('Hero', 'motionToggle', view);
		if (!btn) return;
		if (reduced.matches) return btn.remove();
		const sync = () => {
			btn.setAttribute('aria-pressed', String(paused));
			btn.innerHTML = `${paused ? PLAY : PAUSE}<span>${paused ? 'Play motion' : 'Pause motion'}</span>`;
		};
		sync();
		btn.addEventListener('click', () => {
			paused = !paused;
			store.set('motion-paused', paused ? '1' : '0');
			syncMotionAttr();
			sync();
		});
	}

	// -------------------------------------------------------------- magnetic
	function initMagnetic(root, signal) {
		mods('MagneticButton', 'host', root).forEach((host) => {
			const surface = mod('MagneticButton', 'surface', host);
			const label = mod('MagneticButton', 'label', host);
			if (!surface || !label) return;
			const follow = 'transform .45s cubic-bezier(.22,1,.36,1)';
			const release = 'transform .9s cubic-bezier(.34,1.8,.5,1)';
			host.addEventListener(
				'pointermove',
				(e) => {
					if (!allowPointer() || e.pointerType !== 'mouse') return;
					const r = host.getBoundingClientRect();
					const dx = e.clientX - (r.left + r.width / 2);
					const dy = e.clientY - (r.top + r.height / 2);
					surface.style.transition = label.style.transition = follow;
					surface.style.transform = `translate(${dx * 0.35}px,${dy * 0.35}px)`;
					label.style.transform = `translate(${dx * 0.18}px,${dy * 0.18}px)`;
				},
				{ signal },
			);
			host.addEventListener(
				'pointerleave',
				() => {
					surface.style.transition = label.style.transition = release;
					surface.style.transform = label.style.transform = '';
				},
				{ signal },
			);
		});
	}

	// ------------------------------------------------- work rows + preview
	function initLists(signal) {
		mods('ProjectList', 'wrap', view).forEach((wrap) => {
			const list = $('ul', wrap);
			const followers = mods('ProjectList', 'follower', wrap);
			const preview = mod('ProjectList', 'preview', wrap);
			const cursor = mod('ProjectList', 'cursor', wrap);
			if (!list || followers.length < 2 || !preview || !cursor) return;
			const slider = preview.firstElementChild;
			const rows = $$('li', list);
			// Fill preview slides from each row's thumbnail.
			$$(':scope > div', slider).forEach((slide, i) => {
				const thumb = rows[i] && $('img[data-asset]', rows[i]);
				if (thumb && !slide.firstChild) {
					const img = document.createElement('img');
					img.alt = '';
					img.src = ASSETS[thumb.dataset.asset];
					slide.append(img);
				}
			});
			const [cardLayer, cursorLayer] = followers;
			cardLayer.style.transition = 'transform .55s cubic-bezier(.22,1,.36,1)';
			cursorLayer.style.transition = 'transform .35s cubic-bezier(.22,1,.36,1)';
			const hide = () => {
				delete preview.dataset.visible;
				delete cursor.dataset.visible;
			};
			const place = (x, y) => {
				const w = preview.offsetWidth;
				const h = preview.offsetHeight;
				const cx = Math.min(Math.max(x, w / 2), innerWidth - w / 2);
				const cy = Math.min(Math.max(y, h / 2), innerHeight - h / 2);
				cardLayer.style.transform = `translate(${cx}px,${cy}px)`;
				cursorLayer.style.transform = `translate(${x}px,${y}px)`;
			};
			list.addEventListener(
				'pointerenter',
				(e) => {
					if (!allowPointer() || e.pointerType !== 'mouse') return;
					cardLayer.style.transition = cursorLayer.style.transition = 'none';
					place(e.clientX, e.clientY);
					requestAnimationFrame(() => {
						cardLayer.style.transition = 'transform .55s cubic-bezier(.22,1,.36,1)';
						cursorLayer.style.transition = 'transform .35s cubic-bezier(.22,1,.36,1)';
					});
				},
				{ signal },
			);
			list.addEventListener(
				'pointermove',
				(e) => allowPointer() && e.pointerType === 'mouse' && place(e.clientX, e.clientY),
				{ signal },
			);
			rows.forEach((row, i) =>
				row.addEventListener(
					'pointerenter',
					(e) => {
						if (!allowPointer() || e.pointerType !== 'mouse' || row.hidden) return;
						slider.style.setProperty('--index', String(i)); // slides follow row order
						preview.dataset.visible = 'true';
						cursor.dataset.visible = 'true';
					},
					{ signal },
				),
			);
			list.addEventListener('pointerleave', hide, { signal });
			list.addEventListener('pointercancel', hide, { signal });
			addEventListener('blur', hide, { signal });
			addEventListener('menu:open', hide, { signal });
		});
	}

	// ------------------------------------------------------ work filters/view
	const LABELS = {
		All: null,
		'Graphic Design': 'graphic-design',
		'3D': '3d',
		'Art Direction': 'art-direction',
	};
	const workState = { category: null, view: 'list' };
	function initWorkIndex(signal) {
		const filters = $('[role="group"][aria-label^="Filter"]', view);
		if (!filters) return;
		const views = $('[role="group"][aria-label="Layout"]', view);
		const listWrap = mod('ProjectList', 'wrap', view);
		const grid = $('[data-grid]', view);
		const status = $('p[role="status"]', view);
		const apply = () => {
			let count = 0;
			$$('li[data-category]', listWrap).forEach((li) => {
				li.hidden = Boolean(workState.category) && li.dataset.category !== workState.category;
				if (!li.hidden) count++;
			});
			$$('li[data-category]', grid).forEach(
				(li) => (li.hidden = Boolean(workState.category) && li.dataset.category !== workState.category),
			);
			$$('button', filters).forEach((b) => {
				const label = b.firstChild.textContent.trim();
				b.setAttribute('aria-pressed', String(LABELS[label] === workState.category));
			});
			listWrap.hidden = workState.view !== 'list';
			grid.hidden = workState.view !== 'grid';
			$$('button', views).forEach((b, i) =>
				b.setAttribute('aria-pressed', String((i === 0 ? 'list' : 'grid') === workState.view)),
			);
			if (status) status.textContent = `${count} ${count === 1 ? 'project' : 'projects'}`;
		};
		$$('button', filters).forEach((b) =>
			b.addEventListener(
				'click',
				() => {
					workState.category = LABELS[b.firstChild.textContent.trim()] ?? null;
					apply();
				},
				{ signal },
			),
		);
		$$('button', views).forEach((b, i) =>
			b.addEventListener(
				'click',
				() => {
					workState.view = i === 0 ? 'list' : 'grid';
					apply();
				},
				{ signal },
			),
		);
		apply();
	}

	// ------------------------------------------------------------------ video
	let activeVideo = null;
	function initVideo(signal) {
		mods('VideoPoster', 'root', view).forEach((rootEl) => {
			const btn = $('button', rootEl);
			const video = document.createElement('video');
			video.className = swapPart(rootEl, 'root', 'video') ?? '';
			video.muted = true;
			video.loop = true;
			video.playsInline = true;
			video.setAttribute('aria-label', btn?.getAttribute('aria-label')?.replace(/^Play: /, '') ?? '');
			for (const [key, type] of [
				[CONFIG.video.mp4, 'video/mp4'],
				[CONFIG.video.webm, 'video/webm'],
			]) {
				const s = document.createElement('source');
				s.src = ASSETS[key];
				s.type = type;
				video.append(s);
			}
			let userPaused = false;
			btn.before(video);
			const label = video.getAttribute('aria-label');
			const sync = () => {
				const playing = !video.paused;
				if (playing) video.dataset.ready = 'true';
				btn.innerHTML = playing ? PAUSE.replace(/14/g, '16') : PLAY.replace(/14/g, '16');
				btn.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'}: ${label}`);
			};
			const play = () => {
				if (activeVideo && activeVideo !== video) activeVideo.pause();
				activeVideo = video;
				video.play().catch(sync);
			};
			video.addEventListener('play', sync);
			video.addEventListener('pause', sync);
			const io = new IntersectionObserver(
				([e]) => (e.isIntersecting && allowAutoplay() && !userPaused ? play() : video.pause()),
				{ threshold: 0.25 },
			);
			io.observe(rootEl);
			btn.addEventListener(
				'click',
				() => {
					if (video.paused) {
						userPaused = false;
						play();
					} else {
						userPaused = true;
						video.pause();
					}
				},
				{ signal },
			);
			signal.addEventListener('abort', () => {
				io.disconnect();
				video.pause();
			});
		});
	}

	// ------------------------------------------------------------- local time
	function initLocalTime(signal) {
		const fmt = new Intl.DateTimeFormat('en-GB', {
			timeZone: 'Asia/Baghdad',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		});
		const update = () => $$('time', view).forEach((t) => (t.textContent = `${fmt.format(new Date())} GMT+3`));
		update();
		const id = setInterval(update, 30000);
		signal.addEventListener('abort', () => clearInterval(id));
	}

	// ------------------------------------------------------------ contact form
	function initForm(signal) {
		const form = $('form', view);
		if (!form) return;
		const status = $('[role="status"]', form);
		const failureClass = swapPart(status, 'status', 'failure');
		const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		const messages = {
			name: 'Please enter your name.',
			email: 'Please enter a valid email address.',
			message: 'Please write at least 10 characters about your project.',
		};
		form.addEventListener(
			'submit',
			(e) => {
				e.preventDefault();
				const data = Object.fromEntries(new FormData(form));
				const errors = {};
				if (!String(data.name || '').trim()) errors.name = messages.name;
				if (!EMAIL.test(String(data.email || '').trim())) errors.email = messages.email;
				if (String(data.message || '').trim().length < 10) errors.message = messages.message;
				mods('ContactForm', 'field', form).forEach((field) => {
					const input = $('input, textarea', field);
					const old = $('p[data-error]', field);
					old?.remove();
					const msg = errors[input.name];
					if (msg) {
						field.dataset.invalid = '';
						input.setAttribute('aria-invalid', 'true');
						const p = document.createElement('p');
						p.dataset.error = '';
						p.id = `${input.id}-error`;
						p.className = swapPart(field, 'field', 'error') ?? '';
						p.textContent = msg;
						field.append(p);
						input.setAttribute('aria-describedby', p.id);
					} else {
						delete field.dataset.invalid;
						input.removeAttribute('aria-invalid');
						input.removeAttribute('aria-describedby');
					}
				});
				const first = Object.keys(errors)[0];
				const say = (text) => (status.innerHTML = `<p class="${failureClass ?? ''}">${text}</p>`);
				if (first) {
					form.elements[first]?.focus();
					return say('Please check the highlighted fields.');
				}
				say('Not sent: this is a static preview and the form is not connected to an email service.');
			},
			{ signal },
		);
	}

	// ----------------------------------------------------------------- reveal
	function initReveal(signal) {
		if (!('IntersectionObserver' in window)) return;
		const els = $$('[data-reveal]', view);
		els.forEach((el) => el.getBoundingClientRect().top < innerHeight && (el.dataset.revealed = ''));
		html.dataset.revealReady = '';
		const io = new IntersectionObserver(
			(entries) =>
				entries.forEach((en) => {
					if (en.isIntersecting) {
						en.target.dataset.revealed = '';
						io.unobserve(en.target);
					}
				}),
			{ rootMargin: '0px 0px -8% 0px' },
		);
		els.filter((el) => !('revealed' in el.dataset)).forEach((el) => io.observe(el));
		signal.addEventListener('abort', () => io.disconnect());
	}

	go(true);
})();
