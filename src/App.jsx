import { useState, useEffect, useMemo, useCallback, useDeferredValue, useRef, memo } from 'react';
import Fuse from 'fuse.js';
import postsData from './data/posts.json';

const PAGE_SIZE = 20;

// Sort + precompute lowercase search text once at module load (not on every keystroke)
const SORTED_POSTS = postsData
  .map(p => ({ ...p, search: (p.ocr_text || '').toLocaleLowerCase('tr-TR') }))
  .sort((a, b) => new Date(b.date) - new Date(a.date));
const POSTS_BY_ID = new Map(SORTED_POSTS.map(p => [String(p.id), p]));

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

// ---- Hash router: #/ , #/hakkimizda , #/iletisim , #/p/<id> ----
function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, '');
  if (h === 'hakkimizda') return { page: 'about', postId: null };
  if (h === 'iletisim') return { page: 'contact', postId: null };
  if (h.startsWith('p/')) return { page: 'home', postId: decodeURIComponent(h.slice(2)) };
  return { page: 'home', postId: null };
}

// Number of hash changes since load: lets us safely use history.back() only for in-app navigation
let inAppNavs = 0;

function useHashRoute() {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const onChange = () => { inAppNavs++; setRoute(parseHash()); };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

const navigate = (path) => {
  window.location.hash = path;
};

// ---- Icons ----
const BookmarkIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
);
const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
);

// ---- Card (memoized so typing in search / saving doesn't re-render all cards) ----
const PostCard = memo(function PostCard({ post, isSaved, onToggleSave, priority }) {
  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/p/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Kuran Blog', text: post.text?.slice(0, 120), url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Bağlantı panoya kopyalandı!');
      }
    } catch { /* user cancelled */ }
  };

  return (
    <article className="card">
      {post.image && (
        <a href={`#/p/${post.id}`} className="card-image-link" aria-label="İçeriği oku">
          <img
            src={post.thumb || post.image}
            alt="Kapak Görseli"
            className="card-image"
            width="480"
            height="600"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
          />
        </a>
      )}
      <div className="card-content">
        <div className="card-header">
          <span className="card-date">{dateFormatter.format(new Date(post.date))}</span>
          <button
            className={`action-btn ${isSaved ? 'saved' : ''}`}
            onClick={() => onToggleSave(post.id)}
            title={isSaved ? 'Kaydedilenlerden Çıkar' : 'Kaydet'}
            aria-pressed={isSaved}
          >
            <BookmarkIcon filled={isSaved} />
          </button>
        </div>
        <p className="card-text">{post.text}</p>

        <div className="card-actions">
          <a className="action-btn" href={`#/p/${post.id}`} title="İçeriği Oku">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
            İçeriği Oku
          </a>
          <a className="action-btn" href={post.url} target="_blank" rel="noreferrer" title="Instagram'da gör">
            <InstagramIcon />
          </a>
          <button className="action-btn" onClick={share} title="Paylaş">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
          </button>
        </div>
      </div>
    </article>
  );
});

// ---- Post modal with swipe, keyboard, preloading ----
function PostModal({ post, onClose }) {
  const images = useMemo(() => (post.images?.length ? post.images : [post.image]), [post]);
  const [index, setIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const touchStartX = useRef(null);

  const go = useCallback((dir) => {
    setIndex(i => Math.min(images.length - 1, Math.max(0, i + dir)));
    setIsZoomed(false);
  }, [images.length]);

  // Keyboard + body scroll lock
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [go, onClose]);

  // Preload neighbour images so slide changes are instant
  useEffect(() => {
    [index + 1, index - 1].forEach(i => {
      if (images[i]) { const im = new Image(); im.src = images[i]; }
    });
  }, [index, images]);

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null || isZoomed) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="close-btn" onClick={onClose} aria-label="Kapat">×</button>

        <div className="modal-images-container" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {index > 0 && (
            <button className="slider-btn prev-btn" onClick={() => go(-1)} aria-label="Önceki">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          )}

          <div className={`slider-image-wrapper ${isZoomed ? 'zoomed' : ''}`} onClick={() => setIsZoomed(z => !z)}>
            <img key={images[index]} src={images[index]} alt={`Görsel ${index + 1}`} className="slider-image" decoding="async" />
          </div>

          {index < images.length - 1 && (
            <button className="slider-btn next-btn" onClick={() => go(1)} aria-label="Sonraki">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          )}

          {images.length > 1 && (
            <div className="slider-counter">{index + 1} / {images.length}</div>
          )}
        </div>

        <div className="modal-text-container">
          <p>{post.text}</p>
          <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
            <a className="action-btn" href={post.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)' }}>
              <InstagramIcon />
              Orijinal Posta Git
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaticPage({ title, children }) {
  return (
    <div className="page-content">
      <a className="back-btn" href="#/">
        <BackIcon />
        Geri Dön
      </a>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function App() {
  const { page, postId } = useHashRoute();
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery);
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [savedPosts, setSavedPosts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('savedPosts')) || []; } catch { return []; }
  });
  const sentinelRef = useRef(null);

  const savedSet = useMemo(() => new Set(savedPosts), [savedPosts]);
  const selectedPost = postId ? POSTS_BY_ID.get(postId) : null;

  useEffect(() => {
    localStorage.setItem('savedPosts', JSON.stringify(savedPosts));
  }, [savedPosts]);

  // Scroll to top when switching static pages
  useEffect(() => {
    if (page !== 'home') window.scrollTo(0, 0);
  }, [page]);

  // Pagination is reset directly in the search / saved-filter handlers (avoids an extra render)

  const toggleTheme = () => {
    const next = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  const toggleSavePost = useCallback((id) => {
    setSavedPosts(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }, []);

  const closeModal = useCallback(() => {
    // Opened from inside the app -> go back (keeps history clean, restores scroll).
    // Opened via a shared deep link -> just route home instead of leaving the site.
    if (inAppNavs > 0) window.history.back();
    else navigate('/');
  }, []);

  const fuse = useMemo(() => new Fuse(SORTED_POSTS, {
    keys: ['search', 'ocr_text'],
    threshold: 0.3,
    ignoreLocation: true
  }), []);

  const filteredPosts = useMemo(() => {
    const q = deferredQuery.trim().toLocaleLowerCase('tr-TR');
    
    // First apply saved filter if needed
    let baseData = SORTED_POSTS;
    if (showSavedOnly) {
      baseData = SORTED_POSTS.filter(p => savedSet.has(p.id));
    }
    
    if (!q) return baseData;
    
    // If fuzzy search, we need to create a new Fuse instance for the filtered subset 
    // or just search in all and then filter. Searching in all and filtering is easier.
    const results = fuse.search(q).map(result => result.item);
    if (showSavedOnly) {
      return results.filter(p => savedSet.has(p.id));
    }
    return results;
  }, [deferredQuery, showSavedOnly, savedSet, fuse]);

  const currentPosts = filteredPosts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPosts.length;

  // Infinite scroll: load next page when the sentinel approaches the viewport
  useEffect(() => {
    if (page !== 'home' || !hasMore || !sentinelRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisibleCount(c => c + PAGE_SIZE); },
      { rootMargin: '600px' }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [page, hasMore, currentPosts.length]);

  return (
    <div className="app-wrapper">
      <header className="header">
        <a className="logo" href="#/">
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
            Kuran Blog
          </h1>
        </a>
        <button onClick={toggleTheme} className="theme-toggle" aria-label="Temayı Değiştir">
          {isDarkMode ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="4.22" x2="19.78" y2="5.64" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
          )}
        </button>
      </header>

      <main className="container">
        {/* Home stays mounted (hidden) so returning from other pages is instant and keeps scroll/search state */}
        <div hidden={page !== 'home'}>
          <div className="controls">
            <div className="search-container">
              <div className="search-field">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input
                  type="search"
                  className="search-input"
                  placeholder="Gönderilerde ara..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(PAGE_SIZE); }}
                  enterKeyHint="search"
                />
              </div>
              <button
                className={`filter-btn ${showSavedOnly ? 'active' : ''}`}
                onClick={() => { setShowSavedOnly(s => !s); setVisibleCount(PAGE_SIZE); }}
                title="Kaydedilenler"
              >
                <BookmarkIcon filled={showSavedOnly} />
                {showSavedOnly ? 'Tümünü Gör' : `Kaydedilenler${savedPosts.length ? ` (${savedPosts.length})` : ''}`}
              </button>
            </div>
            <span className="result-count">{filteredPosts.length} gönderi</span>
          </div>

          <div className="grid">
            {currentPosts.length > 0 ? (
              currentPosts.map((post, i) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isSaved={savedSet.has(post.id)}
                  onToggleSave={toggleSavePost}
                  priority={i < 3}
                />
              ))
            ) : (
              <div className="empty-state">
                <h3>Sonuç bulunamadı</h3>
                <p>Arama terimini değiştirin veya kaydedilenler filtrenizi kaldırın.</p>
              </div>
            )}
          </div>

          {hasMore && (
            <div ref={sentinelRef} className="load-more" aria-live="polite">
              <button className="filter-btn active" onClick={() => setVisibleCount(c => c + PAGE_SIZE)} aria-label="Daha fazla gönderi yükle">
                Daha Fazla Yükle
              </button>
            </div>
          )}
        </div>

        {page === 'about' && (
          <StaticPage title="Hakkımızda">
            <p>Kuran Blog, hakikati arama yolculuğunda din, felsefe, bilim ve teoloji gibi alanlarda derinlemesine sorgulamalar yapan bağımsız bir platformdur.</p>
            <p>Amacımız; aklı ve bilimi rehber edinerek kalıplaşmış dogmalardan uzak, Kuran merkezli yenilikçi bir bakış açısı sunmaktır.</p>
            <p>Burada yer alan yazılar, düşünmeye ve sorgulamaya davet niteliğindedir.</p>
          </StaticPage>
        )}

        {page === 'contact' && (
          <StaticPage title="İletişim">
            <p>Görüş, öneri veya sorularınız için bizimle aşağıdaki kanallardan iletişime geçebilirsiniz. Fikirleriniz bizim için değerlidir.</p>
            <a href="https://instagram.com/teolojikfelsefe1" target="_blank" rel="noreferrer" className="filter-btn active contact-btn">
              <InstagramIcon />
              Instagram'dan Bize Ulaşın
            </a>
          </StaticPage>
        )}
      </main>

      {selectedPost && <PostModal post={selectedPost} onClose={closeModal} />}

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Kuran Blog</h3>
            <p>Din, felsefe, bilim, teoloji ve evren üzerine sorgulamalar.</p>
          </div>
          <div className="footer-section">
            <h3>Hızlı Bağlantılar</h3>
            <ul>
              <li><a href="#/hakkimizda">Hakkımızda</a></li>
              <li><a href="#/iletisim">İletişim</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Kuran Blog. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
