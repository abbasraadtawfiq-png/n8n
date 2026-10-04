/*
 * Preview runtime: reproduces the portfolio's interactions on the static
 * snapshot built by build.mjs (no Next.js, no network apart from the pinned
 * Lenis / model-viewer scripts from jsDelivr). Dependency-free.
 */
(() => {
	'use strict';
	const ASSETS = JSON.parse(document.getElementById('preview-assets').textContent);
	const CONFIG = JSON.parse(document.getElementById('preview-config').textContent);
	const html = document.documentElement;
	const $ = (sel, root = document) => root.querySelector(sel);
	const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
	// CSS-module classes look like "Name-module__hash__part"; match the part exactly.
	const hasPart = (el, name, part) => Array.from(el.classList).some((c) => c.startsWith(`${name}-module__`) && c.endsWith(`__${part}`));
	const mods = (name, part, root = document) => $$(`[class*="${name}-module__"]`, root).filter((el) => hasPart(el, name, part));
	const mod = (name, part, root) => mods(name, part, root)[0] ?? null;
	const swapPart = (el, from, to) => Array.from(el.classList).find((c) => c.endsWith(`__${from}`))?.replace(new RegExp(`__${from}$`), `__${to}`) ?? '';
	const reduced = matchMedia('(prefers-reduced-motion: reduce)');
	const fine = matchMedia('(hover: hover) and (pointer: fine)');
	const store = {
		get: (k) => { try { return sessionStorage.getItem(k) ?? localStorage.getItem(k); } catch { return null; } },
		setLocal: (k, v) => { try { localStorage.setItem(k, v); } catch { /* unavailable */ } },
		setSession: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* unavailable */ } },
	};
	let paused = store.get('motion-paused') === '1';
	const allowAutoplay = () => !reduced.matches && !paused;
	const allowPointer = () => !reduced.matches && fine.matches;
	const syncMotionAttr = () => (html.dataset.motion = allowAutoplay() ? 'running' : 'paused');
	syncMotionAttr();

	const view = document.getElementById('view');
	const top = $('[data-menu-inert]');
	const header = $('header', top);
	const menuRoot = mod('MenuDrawer', 'root');
	const curtain = $('[data-phase]');
	let routeCtl = new AbortController();
	let current = null;
	let lenis = null;

	const fillAssets = (root) => {
		$$('img[data-asset]', root).forEach((img) => ASSETS[img.dataset.asset] && (img.src = ASSETS[img.dataset.asset]));
		$$('source[data-asset]', root).forEach((s) => ASSETS[s.dataset.asset] && (s.src = ASSETS[s.dataset.asset]));
		$$('video[data-poster-asset]', root).forEach((v) => (v.poster = ASSETS[v.dataset.posterAsset] ?? ''));
	};
	fillAssets(document);

	const lockScroll = () => lenis?.stop();
	const unlockScroll = () => lenis?.start();

	// ---------------------------------------------------------------- router
	const routeFromHash = () => {
		const h = location.hash.slice(1);
		if (!h || h === 'main') return 'home';
		return CONFIG.routes.includes(h) ? h : 'notfound';
	};
	const navLinkActive = (href, route) => {
		const t = href.replace('#', '');
		if (t === 'home') return route === 'home';
		if (t === 'work') return route === 'work' || route.startsWith('p-');
		return t === route;
	};

	function render(route) {
		routeCtl.abort();
		routeCtl = new AbortController();
		const tpl = document.getElementById(`route-${route}`);
		view.replaceChildren(tpl.content.cloneNode(true));
		document.title = tpl.dataset.title;
		header.dataset.theme = route === 'home' || route === 'contact' ? 'light' : 'dark';
		$$('a[href^="#"]', top)
			.concat($$('nav a[href^="#"]', menuRoot))
			.forEach((a) => (navLinkActive(a.getAttribute('href'), route) ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
		fillAssets(view);
		const signal = routeCtl.signal;
		[initMarquee, initMotionToggle, initMagnetic, initLists, initWorkIndex, initVideo, initLocalTime, initForm, initLightbox, initCompare, initModels].forEach((f) => f(signal));
		current = route;
		window.scrollTo(0, 0);
		lenis?.scrollTo(0, { immediate: true, force: true });
	}

	// Curtain: cover → switch route → lift (skipped with reduced motion and for back/forward).
	const curtainLabel = curtain ? $('p', curtain) : null;
	let curtainBusy = false;
	function navigateWithCurtain(hash) {
		const target = hash.slice(1) || 'home';
		if (reduced.matches || !curtain || curtainBusy) {
			location.hash = hash;
			return;
		}
		curtainBusy = true;
		if (curtainLabel) curtainLabel.lastChild.textContent = CONFIG.labels[target] ?? '';
		curtain.dataset.phase = 'cover';
		html.dataset.curtain = 'cover';
		setTimeout(() => {
			curtain.dataset.phase = 'covered';
			location.hash = hash;
			setTimeout(() => {
				curtain.dataset.phase = 'reveal';
				setTimeout(() => {
					curtain.dataset.phase = 'idle';
					delete html.dataset.curtain;
					curtainBusy = false;
				}, 750);
			}, 120);
		}, 500);
	}

	document.addEventListener(
		'click',
		(e) => {
			if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			const a = e.target.closest?.('a[href^="#"]');
			if (!a || a.dataset.fullAsset !== undefined) return;
			const href = a.getAttribute('href');
			if (href === '#main') {
				e.preventDefault();
				$('#main', view)?.focus();
				return;
			}
			const target = href.slice(1) || 'home';
			if (!CONFIG.routes.includes(target) || target === current) {
				if (target === current) closeMenu(false);
				return;
			}
			e.preventDefault();
			navigateWithCurtain(href);
		},
		true,
	);

	function go(first) {
		const route = routeFromHash();
		if (route === current) return;
		closeMenu(false);
		render(route);
		if (!first) $('#main', view)?.focus({ preventScroll: true });
	}
	addEventListener('hashchange', () => go(false));

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
		top.inert = view.inert = true;
		syncTrigger();
		lockScroll();
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
		top.inert = view.inert = false;
		syncTrigger();
		unlockScroll();
		if (restore && returnFocus?.getClientRects().length) returnFocus.focus();
	}
	trigger.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu(trigger)));
	headerMenuButton?.addEventListener('click', () => openMenu(headerMenuButton));
	overlay.addEventListener('click', () => closeMenu());
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
				items.at(-1).focus();
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

	// ---------------------------------------------------- preloader + reveal
	const preloader = mods('Preloader', 'preloader')[0];
	const WORDS = ['Hello', 'Bonjour', 'Hola', 'Ciao', 'Hallo', 'Olá', 'Hej', 'Merhaba'];
	function runPreloader() {
		if (html.dataset.preload !== 'run' || !preloader) return;
		const word = $('p', preloader);
		let t = 420;
		WORDS.slice(1).forEach((w) => {
			setTimeout(() => (word.lastChild.textContent = w), t);
			t += 120;
		});
		setTimeout(() => {
			preloader.dataset.leaving = 'true';
			dispatchEvent(new Event('preloader:done'));
		}, t + 120);
		setTimeout(() => {
			delete html.dataset.preload;
			store.setSession('preloaded', '1');
		}, t + 920);
	}

	function initReveal(signal) {
		const all = $$('[data-reveal]:not([data-revealed])', view);
		const vh = innerHeight;
		const inView = (el) => el.getBoundingClientRect().top < vh;
		const reveal = (el) => (el.dataset.revealed = '');
		all.filter((el) => el.dataset.reveal !== 'split' && inView(el)).forEach(reveal);
		html.dataset.revealReady = '';
		const splits = all.filter((el) => el.dataset.reveal === 'split' && inView(el));
		const play = () => requestAnimationFrame(() => requestAnimationFrame(() => splits.forEach(reveal)));
		if (html.dataset.preload === 'run') addEventListener('preloader:done', play, { once: true, signal });
		else setTimeout(play, html.dataset.curtain ? 250 : 0);
		const io = new IntersectionObserver(
			(entries) =>
				entries.forEach((en) => {
					if (en.isIntersecting) {
						reveal(en.target);
						io.unobserve(en.target);
					}
				}),
			{ rootMargin: '0px 0px -8% 0px' },
		);
		all.filter((el) => !splits.includes(el) && !('revealed' in el.dataset)).forEach((el) => io.observe(el));
		signal.addEventListener('abort', () => io.disconnect());
	}

	// --------------------------------------------------------------- marquee
	function initMarquee(signal) {
		const track = mod('NameMarquee', 'track', view);
		if (!track) return;
		const copy = track.firstElementChild;
		let x = 0, dir = -1, boost = 0, visible = true, last = performance.now(), lastY = scrollY, raf = 0;
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
		addEventListener('scroll', () => {
			const d = scrollY - lastY;
			lastY = scrollY;
			if (d) dir = d > 0 ? -1 : 1;
			boost = Math.min(4, boost + Math.abs(d) * 0.06);
		}, { passive: true, signal });
		signal.addEventListener('abort', () => {
			cancelAnimationFrame(raf);
			io.disconnect();
		});
	}

	const PAUSE = (s) => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="${s}" height="${s}"><rect x="6" y="5" width="4" height="14"></rect><rect x="14" y="5" width="4" height="14"></rect></svg>`;
	const PLAY = (s) => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="${s}" height="${s}"><path d="M7 4.5v15l12-7.5z"></path></svg>`;
	function initMotionToggle() {
		const btn = mod('Hero', 'motionToggle', view);
		if (!btn) return;
		if (reduced.matches) return btn.remove();
		const sync = () => {
			btn.setAttribute('aria-pressed', String(paused));
			btn.innerHTML = `${paused ? PLAY(14) : PAUSE(14)}<span>${paused ? 'Play motion' : 'Pause motion'}</span>`;
		};
		sync();
		btn.addEventListener('click', () => {
			paused = !paused;
			store.setLocal('motion-paused', paused ? '1' : '0');
			syncMotionAttr();
			sync();
		});
	}

	// -------------------------------------------------------------- magnetic
	function initMagnetic(signal) {
		mods('MagneticButton', 'host', view).forEach((host) => {
			const surface = mod('MagneticButton', 'surface', host);
			const label = mod('MagneticButton', 'label', host);
			if (!surface || !label) return;
			host.addEventListener('pointermove', (e) => {
				if (!allowPointer() || e.pointerType !== 'mouse') return;
				const r = host.getBoundingClientRect();
				const dx = e.clientX - (r.left + r.width / 2);
				const dy = e.clientY - (r.top + r.height / 2);
				surface.style.transition = label.style.transition = 'transform .45s cubic-bezier(.22,1,.36,1)';
				surface.style.transform = `translate(${dx * 0.35}px,${dy * 0.35}px)`;
				label.style.transform = `translate(${dx * 0.18}px,${dy * 0.18}px)`;
			}, { signal });
			host.addEventListener('pointerleave', () => {
				surface.style.transition = label.style.transition = 'transform .9s cubic-bezier(.34,1.8,.5,1)';
				surface.style.transform = label.style.transform = '';
			}, { signal });
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
			$$(':scope > div', slider).forEach((slide, i) => {
				const thumb = rows[i] && $('img[data-asset]', rows[i]);
				if (thumb && !slide.firstChild) {
					const img = document.createElement('img');
					img.alt = '';
					img.src = ASSETS[thumb.dataset.asset];
					slide.append(img);
				}
			});
			const [card, cur] = followers;
			const ease = () => {
				card.style.transition = 'transform .55s cubic-bezier(.22,1,.36,1)';
				cur.style.transition = 'transform .35s cubic-bezier(.22,1,.36,1)';
			};
			const hide = () => {
				delete preview.dataset.visible;
				delete cursor.dataset.visible;
			};
			const place = (x, y) => {
				const w = preview.offsetWidth, h = preview.offsetHeight;
				card.style.transform = `translate(${Math.min(Math.max(x, w / 2), innerWidth - w / 2)}px,${Math.min(Math.max(y, h / 2), innerHeight - h / 2)}px)`;
				cur.style.transform = `translate(${x}px,${y}px)`;
			};
			list.addEventListener('pointerenter', (e) => {
				if (!allowPointer() || e.pointerType !== 'mouse') return;
				card.style.transition = cur.style.transition = 'none';
				place(e.clientX, e.clientY);
				requestAnimationFrame(ease);
			}, { signal });
			list.addEventListener('pointermove', (e) => allowPointer() && e.pointerType === 'mouse' && place(e.clientX, e.clientY), { signal });
			rows.forEach((row, i) =>
				row.addEventListener('pointerenter', (e) => {
					if (!allowPointer() || e.pointerType !== 'mouse' || row.hidden) return;
					slider.style.setProperty('--index', String(i));
					preview.dataset.visible = cursor.dataset.visible = 'true';
				}, { signal }),
			);
			list.addEventListener('pointerleave', hide, { signal });
			addEventListener('blur', hide, { signal });
			addEventListener('menu:open', hide, { signal });
		});
	}

	// ------------------------------------------------------ work filters/view
	const LABELS = { All: null, 'Graphic Design': 'graphic-design', '3D': '3d', 'Art Direction': 'art-direction' };
	const workState = { category: null, view: 'list' };
	function initWorkIndex(signal) {
		const filters = $('[role="group"][aria-label^="Filter"]', view);
		if (!filters) return;
		const views = $('[role="group"][aria-label="Layout"]', view);
		const results = mod('WorkIndex', 'results', view);
		const listWrap = mod('ProjectList', 'wrap', view);
		const grid = $('[data-grid]', view);
		const status = $('p[role="status"]', view);
		const apply = (animate) => {
			let count = 0;
			for (const container of [listWrap, grid]) {
				let i = 0;
				$$('li[data-category]', container).forEach((li) => {
					li.hidden = Boolean(workState.category) && li.dataset.category !== workState.category;
					if (!li.hidden) li.style.setProperty('--i', String(i++));
				});
				if (container === listWrap) count = i;
			}
			$$('button', filters).forEach((b) => b.setAttribute('aria-pressed', String(LABELS[b.firstChild.textContent.trim()] === workState.category)));
			listWrap.hidden = workState.view !== 'list';
			grid.hidden = workState.view !== 'grid';
			$$('button', views).forEach((b, i) => b.setAttribute('aria-pressed', String((i === 0 ? 'list' : 'grid') === workState.view)));
			if (status) status.textContent = `${count} ${count === 1 ? 'project' : 'projects'}`;
			if (animate && results) {
				delete results.dataset.animate;
				void results.offsetWidth; // restart the entrance animation
				results.dataset.animate = 'true';
			}
		};
		$$('button', filters).forEach((b) =>
			b.addEventListener('click', () => {
				workState.category = LABELS[b.firstChild.textContent.trim()] ?? null;
				apply(true);
			}, { signal }),
		);
		$$('button', views).forEach((b, i) =>
			b.addEventListener('click', () => {
				workState.view = i === 0 ? 'list' : 'grid';
				apply(true);
			}, { signal }),
		);
		apply(false);
	}

	// ------------------------------------------------------------------ video
	let activeVideo = null;
	function initVideo(signal) {
		mods('VideoPoster', 'root', view).forEach((rootEl) => {
			const video = $('video', rootEl);
			const btn = $('button', rootEl);
			if (!video || !btn) return;
			const label = video.getAttribute('aria-label') ?? '';
			video.muted = true;
			let userPaused = false;
			const sync = () => {
				const playing = !video.paused;
				if (playing) video.dataset.ready = 'true';
				btn.innerHTML = playing ? PAUSE(16) : PLAY(16);
				btn.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'}: ${label}`);
			};
			const play = () => {
				if (activeVideo && activeVideo !== video) activeVideo.pause();
				activeVideo = video;
				video.play().catch(sync);
			};
			video.addEventListener('play', sync, { signal });
			video.addEventListener('pause', sync, { signal });
			video.load();
			const io = new IntersectionObserver(([e]) => (e.isIntersecting && allowAutoplay() && !userPaused ? play() : video.pause()), { threshold: 0.25 });
			io.observe(rootEl);
			btn.addEventListener('click', () => {
				if (video.paused) {
					userPaused = false;
					play();
				} else {
					userPaused = true;
					video.pause();
				}
			}, { signal });
			signal.addEventListener('abort', () => {
				io.disconnect();
				video.pause();
			});
		});
	}

	// --------------------------------------------------------------- lightbox
	function initLightbox(signal) {
		const dialog = mod('GalleryLightbox', 'dialog', view);
		if (!dialog) return;
		const links = $$('a[data-full-asset]', view);
		const items = links.map((a) => ({ src: ASSETS[a.dataset.fullAsset], alt: $('img', a)?.alt ?? '' }));
		const c = (part) => swapPart(dialog, 'dialog', part);
		let index = 0, opener = null, zoom = false, swipeX = null;
		const draw = () => {
			const item = items[index];
			dialog.setAttribute('aria-label', `Image viewer ${index + 1} / ${items.length}`);
			dialog.innerHTML = `<div class="${c('stage')}"${zoom ? ' data-zoom="true"' : ''}><button type="button" class="${c('imageButton')}" aria-label="${zoom ? 'Fit image to screen' : 'Zoom in to full resolution'}"><img class="${c('image')}" alt=""></button></div>
<div class="${c('bar')}"><p class="${c('caption')}"><span class="${c('counter')}">${index + 1} / ${items.length}</span><span></span></p><div class="${c('controls')}">${items.length > 1 ? '<button type="button" data-step="-1" aria-label="Previous image">←</button><button type="button" data-step="1" aria-label="Next image">→</button>' : ''}<button type="button" data-close aria-label="Close image viewer">×</button></div></div>`;
			const img = $('img', dialog);
			img.src = item.src;
			img.alt = item.alt;
			$(`.${c('caption')} span:last-child`, dialog).textContent = item.alt;
		};
		const step = (d) => {
			index = (index + d + items.length) % items.length;
			zoom = false;
			draw();
			$('[data-close]', dialog)?.focus();
		};
		links.forEach((a, i) =>
			a.addEventListener('click', (e) => {
				if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
				e.preventDefault();
				opener = a;
				index = i;
				zoom = false;
				draw();
				dialog.showModal();
				html.dataset.lightboxOpen = '';
				lockScroll();
				$('[data-close]', dialog)?.focus();
			}, { signal }),
		);
		dialog.addEventListener('click', (e) => {
			const t = e.target.closest('button');
			if (!t) return;
			if (t.dataset.close !== undefined) dialog.close();
			else if (t.dataset.step) step(Number(t.dataset.step));
			else {
				zoom = !zoom;
				draw();
			}
		}, { signal });
		dialog.addEventListener('keydown', (e) => {
			if (e.key === 'ArrowRight') step(1);
			if (e.key === 'ArrowLeft') step(-1);
		}, { signal });
		dialog.addEventListener('pointerdown', (e) => e.pointerType !== 'mouse' && (swipeX = e.clientX), { signal });
		dialog.addEventListener('pointerup', (e) => {
			if (swipeX === null || zoom) return;
			const dx = e.clientX - swipeX;
			swipeX = null;
			if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
		}, { signal });
		dialog.addEventListener('close', () => {
			delete html.dataset.lightboxOpen;
			unlockScroll();
			dialog.replaceChildren();
			opener?.focus({ preventScroll: true });
		}, { signal });
	}

	// ----------------------------------------------------------- before/after
	function initCompare(signal) {
		mods('CompareSlider', 'root', view).forEach((rootEl) => {
			const range = $('input[type="range"]', rootEl);
			const [before, after] = [mod('CompareSlider', 'tagBefore', rootEl)?.textContent ?? 'Before', mod('CompareSlider', 'tagAfter', rootEl)?.textContent ?? 'After'];
			range.addEventListener('input', () => {
				const v = Number(range.value);
				rootEl.style.setProperty('--pos', `${v}%`);
				range.setAttribute('aria-valuetext', `${v}% ${before}, ${100 - v}% ${after}`);
			}, { signal });
		});
	}

	// --------------------------------------------------------------- 3D model
	let viewerScript = null;
	const loadModelViewer = () =>
		(viewerScript ??= new Promise((resolve, reject) => {
			const s = document.createElement('script');
			s.type = 'module';
			s.src = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.3.1/dist/model-viewer.min.js';
			s.onload = () => customElements.whenDefined('model-viewer').then(resolve);
			s.onerror = reject;
			document.head.append(s);
		}));
	function initModels(signal) {
		mods('ModelViewer', 'root', view).forEach((rootEl) => {
			const btn = mod('ModelViewer', 'cta', rootEl);
			const host = mod('ModelViewer', 'host', rootEl);
			const poster = $('img', rootEl);
			const label = poster?.alt ?? '3D model';
			const showStatus = (text, retry) => {
				$$('[data-status]', rootEl).forEach((n) => n.remove());
				const p = document.createElement(retry ? 'div' : 'p');
				p.dataset.status = '';
				p.className = swapPart(rootEl, 'root', retry ? 'status' : text ? 'status' : 'hint');
				p.setAttribute('role', retry ? 'alert' : 'status');
				p.textContent = text;
				if (retry) {
					const b = document.createElement('button');
					b.type = 'button';
					b.textContent = 'Try again';
					b.onclick = start;
					p.append(b);
				}
				rootEl.append(p);
			};
			async function start() {
				btn?.remove();
				rootEl.dataset.state = 'loading';
				showStatus('Loading 3D model…');
				try {
					await loadModelViewer();
					const bytes = Uint8Array.from(atob(ASSETS[rootEl.dataset.modelAsset].split(',')[1]), (ch) => ch.charCodeAt(0));
					const url = URL.createObjectURL(new Blob([bytes], { type: 'model/gltf-binary' }));
					const mv = document.createElement('model-viewer');
					mv.setAttribute('src', url);
					mv.setAttribute('alt', label);
					mv.setAttribute('camera-controls', '');
					mv.setAttribute('touch-action', 'pan-y');
					mv.setAttribute('shadow-intensity', '0.8');
					mv.setAttribute('interaction-prompt', 'none');
					if (!reduced.matches) mv.setAttribute('auto-rotate', '');
					mv.className = swapPart(rootEl, 'root', 'viewer');
					mv.addEventListener('load', () => {
						rootEl.dataset.state = 'ready';
						$$('[data-status]', rootEl).forEach((n) => n.remove());
						const hint = document.createElement('p');
						hint.className = swapPart(rootEl, 'root', 'hint');
						hint.setAttribute('aria-hidden', 'true');
						hint.textContent = 'Drag to rotate · scroll or pinch to zoom';
						rootEl.append(hint);
					});
					mv.addEventListener('error', () => {
						rootEl.dataset.state = 'error';
						showStatus('The 3D model could not be loaded here.', true);
					});
					host.replaceChildren(mv);
				} catch {
					rootEl.dataset.state = 'error';
					showStatus('The 3D model could not be loaded here.', true);
				}
			}
			btn?.addEventListener('click', start, { signal });
		});
	}

	// ------------------------------------------------------------- local time
	function initLocalTime(signal) {
		const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Baghdad', hour: '2-digit', minute: '2-digit', hour12: false });
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
		const failure = swapPart(status, 'status', 'failure');
		const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		const messages = { name: 'Please enter your name.', email: 'Please enter a valid email address.', message: 'Please write at least 10 characters about your project.' };
		form.addEventListener('submit', (e) => {
			e.preventDefault();
			const data = Object.fromEntries(new FormData(form));
			const errors = {};
			if (!String(data.name || '').trim()) errors.name = messages.name;
			if (!EMAIL.test(String(data.email || '').trim())) errors.email = messages.email;
			if (String(data.message || '').trim().length < 10) errors.message = messages.message;
			mods('ContactForm', 'field', form).forEach((field) => {
				const input = $('input, textarea', field);
				$('p[data-error]', field)?.remove();
				const msg = errors[input.name];
				if (msg) {
					field.dataset.invalid = '';
					input.setAttribute('aria-invalid', 'true');
					const p = document.createElement('p');
					p.dataset.error = '';
					p.id = `${input.id}-error`;
					p.className = swapPart(field, 'field', 'error');
					p.textContent = msg;
					field.append(p);
					input.setAttribute('aria-describedby', p.id);
				} else {
					delete field.dataset.invalid;
					input.removeAttribute('aria-invalid');
					input.removeAttribute('aria-describedby');
				}
			});
			const say = (text) => (status.innerHTML = `<p class="${failure}">${text}</p>`);
			const first = Object.keys(errors)[0];
			if (first) {
				form.elements[first]?.focus();
				return say('Please check the highlighted fields.');
			}
			say('Not sent: this is a static preview and the form is not connected to an email service.');
		}, { signal });
	}

	// ----------------------------------------------------------- smooth scroll
	function initLenis() {
		if (!window.Lenis || !allowPointer()) return;
		lenis = new window.Lenis({ autoRaf: true, lerp: 0.1 });
		$$('[data-lenis-prevent]').forEach(() => undefined);
	}

	// Render, then wrap reveal into render so each route gets it.
	const baseRender = render;
	render = (route) => {
		baseRender(route);
		initReveal(routeCtl.signal);
	};
	go(true);
	runPreloader();
	if (document.readyState === 'complete') initLenis();
	else addEventListener('load', initLenis, { once: true });
})();
