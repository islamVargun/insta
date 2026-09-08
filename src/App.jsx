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

  // Reset image index when a new post is selected
  useEffect(() => {
    if (selectedPost) {
      setCurrentImageIndex(0);
    }
  }, [selectedPost]);

  // Initialize data and categories
  useEffect(() => {
    // Sort posts by date (newest first)
    const sortedPosts = [...postsData].sort((a, b) => new Date(b.date) - new Date(a.date));
    setPosts(sortedPosts);

    // Extract unique categories
    const uniqueCategories = ['Tümü', ...new Set(sortedPosts.map(post => post.category))];
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
    }
  };

  const prevImage = (e) => {
    e.stopPropagation();
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === 'Tümü' || post.category === selectedCategory;
    const matchesSearch = post.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="app-wrapper">
      <header className="header glass">
        <div className="logo">
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
        <div className="controls">
          <div className="filter-bar">
            {categories.map(category => (
              <button 
                key={category} 
                className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="search-container">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Gönderilerde ara..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid">
          {filteredPosts.length > 0 ? (
            filteredPosts.map(post => (
              <article key={post.id} className="card glass">
                {post.image && (
                  <img src={post.image} alt={post.category} className="card-image" loading="lazy" />
                )}
                <div className="card-content">
                  <div className="card-header">
                    <span className="card-category">{post.category}</span>
                    <span className="card-date">
                      {new Date(post.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
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
                        navigator.share({title: 'İlham & Bilgi', text: post.text, url: window.location.href});
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
              <p>Farklı bir arama terimi veya kategori seçmeyi deneyin.</p>
            </div>
          )}
        </div>

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
                    <div className="slider-image-wrapper">
                      <img 
                        src={selectedPost.images[currentImageIndex]} 
                        alt={`${selectedPost.category} ${currentImageIndex+1}`} 
                        className="slider-image" 
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
                  <div className="slider-image-wrapper">
                    <img src={selectedPost.image} alt={selectedPost.category} className="slider-image" />
                  </div>
                )}
              </div>
              
              <div className="modal-text-container">
                <div className="card-header">
                  <span className="card-category">{selectedPost.category}</span>
                </div>
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

      </main>
    </div>
  );
}

export default App;
