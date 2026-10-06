import { useState, useEffect } from 'react';
import postsData from './data/posts.json';

function App() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // New Features States
  const [visibleCount, setVisibleCount] = useState(20);
  const [isZoomed, setIsZoomed] = useState(false);
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'about', 'contact'
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [savedPosts, setSavedPosts] = useState(() => {
    const saved = localStorage.getItem('savedPosts');
    return saved ? JSON.parse(saved) : [];
  });

  // Save bookmarks to local storage
  useEffect(() => {
    localStorage.setItem('savedPosts', JSON.stringify(savedPosts));
  }, [savedPosts]);

  // Reset image index when a new post is selected
  useEffect(() => {
    if (selectedPost) {
      setCurrentImageIndex(0);
      setIsZoomed(false);
    }
  }, [selectedPost]);

  // Initialize data and categories
  useEffect(() => {
    // Sort posts by date (newest first)
    const sortedPosts = [...postsData].sort((a, b) => new Date(b.date) - new Date(a.date));
    setPosts(sortedPosts);

    // Extract unique categories
    const uniqueCategories = ['Tümü', ...new Set(sortedPosts.flatMap(post => post.categories || [post.category]).filter(Boolean))];
    setCategories(uniqueCategories);

    // Check user preference for dark mode
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode ? 'dark' : 'light';
    setIsDarkMode(!isDarkMode);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const nextImage = (e) => {
    e.stopPropagation();
    if (selectedPost && selectedPost.images && currentImageIndex < selectedPost.images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
      setIsZoomed(false);
    }
  };

  const prevImage = (e) => {
    e.stopPropagation();
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
      setIsZoomed(false);
    }
  };

  const toggleSavePost = (e, postId) => {
    e.stopPropagation();
    setSavedPosts(prev => {
      if (prev.includes(postId)) return prev.filter(id => id !== postId);
      return [...prev, postId];
    });
  };

  const filteredPosts = posts.filter(post => {
    if (showSavedOnly && !savedPosts.includes(post.id)) return false;
    
    const searchText = searchQuery.toLocaleLowerCase('tr-TR');
    if (!searchText) return true;
    return post.ocr_text && post.ocr_text.toLocaleLowerCase('tr-TR').includes(searchText);
  });

  const currentPosts = filteredPosts.slice(0, visibleCount);

  return (
    <div className="app-wrapper">
      <header className="header">
        <div className="logo" onClick={() => setCurrentPage('home')} style={{ cursor: 'pointer' }}>
          <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
            </svg>
            Kuran Blog 
          </h1>
        </div>
        <button onClick={toggleTheme} className="theme-toggle" aria-label="Temayı Değiştir">
          {isDarkMode ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="4.22" x2="19.78" y2="5.64"></line></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          )}
        </button>
      </header>

      <main className="container">
        {currentPage === 'home' && (
          <>
            <div className="controls">
              <div className="search-container">
                <div style={{ position: 'relative', flex: 1, width: '100%' }}>
                  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <input 
                    type="text" 
                    className="search-input" 
                    placeholder="Gönderilerde ara..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button 
                  className={`filter-btn ${showSavedOnly ? 'active' : ''}`} 
                  onClick={() => { setShowSavedOnly(!showSavedOnly); setVisibleCount(20); }}
                  title="Kaydedilenler"
                >
                  <svg viewBox="0 0 24 24" fill={showSavedOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                  {showSavedOnly ? "Tümünü Gör" : "Kaydedilenler"}
                </button>
              </div>
            </div>

            <div className="grid">
          {currentPosts.length > 0 ? (
            currentPosts.map(post => (
              <article key={post.id} className="card glass">
                {post.image && (
                  <img src={post.image} alt="Kapak Görseli" className="card-image" loading="lazy" />
                )}
                <div className="card-content">
                  <div className="card-header">
                    <span className="card-date">
                      {new Date(post.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <button 
                      className="action-btn" 
                      onClick={(e) => toggleSavePost(e, post.id)} 
                      title={savedPosts.includes(post.id) ? "Kaydedilenlerden Çıkar" : "Kaydet"}
                    >
                      <svg viewBox="0 0 24 24" fill={savedPosts.includes(post.id) ? "var(--primary-color)" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                    </button>
                  </div>
                  <p className="card-text">{post.text}</p>
                  
                  <div className="card-actions">
                    <button className="action-btn" onClick={() => setSelectedPost(post)} title="İçeriği Oku">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                      İçeriği Oku
                    </button>
                    <button className="action-btn" onClick={() => window.open(post.url, '_blank')} title="Instagram'da gör">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                    </button>
                    <button className="action-btn" onClick={() => {
                      if (navigator.share) {
                        navigator.share({title: 'Kuran Blog', text: post.text, url: window.location.href});
                      } else {
                        navigator.clipboard.writeText(post.text);
                        alert('Metin panoya kopyalandı!');
                      }
                    }} title="Paylaş">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <h3>Sonuç bulunamadı</h3>
              <p>Arama terimini değiştirin veya kaydedilenler filtrenizi kaldırın.</p>
            </div>
          )}
        </div>

        {visibleCount < filteredPosts.length && (
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <button 
              className="filter-btn active" 
              onClick={() => setVisibleCount(prev => prev + 20)}
              style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }}
            >
              Daha Fazla Yükle
            </button>
          </div>
        )}

          </>
        )}

        {selectedPost && (
          <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setSelectedPost(null)}>×</button>
              
              <div className="modal-images-container slider-container">
                {selectedPost.images && selectedPost.images.length > 0 ? (
                  <>
                    {/* Önceki Butonu */}
                    {currentImageIndex > 0 && (
                      <button className="slider-btn prev-btn" onClick={prevImage}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                      </button>
                    )}
                    
                    {/* Resim */}
                    <div className="slider-image-wrapper" onClick={() => setIsZoomed(!isZoomed)} style={{ cursor: 'zoom-in' }}>
                      <img 
                        src={selectedPost.images[currentImageIndex]} 
                        alt="Slider Görseli" 
                        className="slider-image" 
                        style={isZoomed ? { transform: 'scale(1.5)', transition: 'transform 0.3s ease', zIndex: 50, cursor: 'zoom-out' } : { transition: 'transform 0.3s ease' }}
                      />
                    </div>
                    
                    {/* Sonraki Butonu */}
                    {currentImageIndex < selectedPost.images.length - 1 && (
                      <button className="slider-btn next-btn" onClick={nextImage}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                      </button>
                    )}

                    {/* Noktalar (Sayfalama) */}
                    {selectedPost.images.length > 1 && (
                      <div className="slider-dots">
                        {selectedPost.images.map((_, idx) => (
                          <div 
                            key={idx} 
                            className={`slider-dot ${idx === currentImageIndex ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex(idx);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="slider-image-wrapper" onClick={() => setIsZoomed(!isZoomed)} style={{ cursor: 'zoom-in' }}>
                    <img 
                      src={selectedPost.image} 
                      alt="Kapak Görseli" 
                      className="slider-image" 
                      style={isZoomed ? { transform: 'scale(1.5)', transition: 'transform 0.3s ease', zIndex: 50, cursor: 'zoom-out' } : { transition: 'transform 0.3s ease' }}
                    />
                  </div>
                )}
              </div>
              
              <div className="modal-text-container">
                <p>{selectedPost.text}</p>

                <div style={{marginTop: "auto", paddingTop: "2rem"}}>
                   <button className="action-btn" onClick={() => window.open(selectedPost.url, '_blank')} style={{color: "var(--primary-color)"}}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: "8px"}}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                      Orijinal Posta Git
                    </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'about' && (
          <div className="page-content glass">
            <button 
              className="action-btn" 
              onClick={() => setCurrentPage('home')}
              style={{ marginBottom: '2rem', padding: '0.5rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              Geri Dön
            </button>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1.5rem', fontSize: '2.5rem' }}>Hakkımızda</h2>
            <p style={{ marginBottom: '1.2rem', fontSize: '1.1rem', lineHeight: '1.8' }}>
              Kuran Blog, hakikati arama yolculuğunda din, felsefe, bilim ve teoloji gibi alanlarda derinlemesine sorgulamalar yapan bağımsız bir platformdur.
            </p>
            <p style={{ marginBottom: '1.2rem', fontSize: '1.1rem', lineHeight: '1.8' }}>
              Amacımız; aklı ve bilimi rehber edinerek kalıplaşmış dogmalardan uzak, Kuran merkezli yenilikçi bir bakış açısı sunmaktır.
            </p>
            <p style={{ fontSize: '1.1rem', lineHeight: '1.8' }}>
              Burada yer alan yazılar, düşünmeye ve sorgulamaya davet niteliğindedir.
            </p>
          </div>
        )}

        {currentPage === 'contact' && (
          <div className="page-content glass">
            <button 
              className="action-btn" 
              onClick={() => setCurrentPage('home')}
              style={{ marginBottom: '2rem', padding: '0.5rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              Geri Dön
            </button>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: '1.5rem', fontSize: '2.5rem' }}>İletişim</h2>
            <p style={{ marginBottom: '2rem', fontSize: '1.1rem', lineHeight: '1.8' }}>
              Görüş, öneri veya sorularınız için bizimle aşağıdaki kanallardan iletişime geçebilirsiniz. Fikirleriniz bizim için değerlidir.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '300px' }}>
              <a href="https://instagram.com/teolojikfelsefe1" target="_blank" rel="noreferrer" className="filter-btn active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', fontSize: '1.1rem', textDecoration: 'none' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                Instagram'dan Bize Ulaşın
              </a>
            </div>
          </div>
        )}

      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Kuran Blog</h3>
            <p>Din, felsefe, bilim, teoloji ve evren üzerine sorgulamalar.</p>
          </div>
          <div className="footer-section">
            <h3>Hızlı Bağlantılar</h3>
            <ul>
              <li><a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('about'); window.scrollTo(0,0); }}>Hakkımızda</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); setCurrentPage('contact'); window.scrollTo(0,0); }}>İletişim</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Sosyal Medya</h3>
            <ul>
              <li><a href="https://instagram.com/teolojikfelsefe1" target="_blank" rel="noreferrer">Instagram</a></li>
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
