"use client";

import { useState, useEffect } from 'react';

interface BookInfo {
  title: string;
  subtitle: string;
  attribution: {
    editors?: string[];
    contributors?: string[];
    proofreading?: string[];
    indexing?: string[];
    reviewers?: string[];
    originalDesigner: string;
    originalPublisher: string;
    edition: string;
    year: string;
  };
  description: string;
  chapters: Array<{
    id: string;
    title: string;
    sections: string[];
  }>;
}

interface Chapter {
  id: string;
  title: string;
  content: string;
  sections: Array<{
    id: string;
    title: string;
    file: string;
  }>;
}

interface ContentItem {
  type: 'paragraph' | 'list' | 'heading';
  text?: string;
  items?: string[];
}

interface Section {
  id: string;
  title: string;
  content: ContentItem[] | string;
  subsections?: Array<{
    id: string;
    title: string;
    content: ContentItem[] | string;
  }>;
}

export default function RulesIframe() {
  const [books, setBooks] = useState<string[]>([]);
  const [activeBook, setActiveBook] = useState<string>('rules_v3.1');
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string>('1');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [chapterData, setChapterData] = useState<Chapter | null>(null);
  const [sectionData, setSectionData] = useState<Section | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    if (activeBook) {
      loadBookInfo();
    }
  }, [activeBook]);

  useEffect(() => {
    if (activeBook && selectedChapter) {
      loadChapter();
    }
  }, [activeBook, selectedChapter]);

  useEffect(() => {
    if (activeBook && selectedChapter && selectedSection) {
      loadSection();
    }
  }, [activeBook, selectedChapter, selectedSection]);

  const loadBooks = async () => {
    try {
      const response = await fetch('/api/rules/books');
      if (response.ok) {
        const booksList = await response.json();
        setBooks(booksList);
      }
    } catch (error) {
      console.error('Error loading books:', error);
    }
  };

  const loadBookInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rules/book-info?book=${activeBook}`);
      if (response.ok) {
        const info = await response.json();
        setBookInfo(info);
        // Load first chapter by default
        if (info.chapters && info.chapters.length > 0) {
          setSelectedChapter(info.chapters[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading book info:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChapter = async () => {
    try {
      const response = await fetch(`/api/rules/chapter?book=${activeBook}&chapter=${selectedChapter}`);
      if (response.ok) {
        const chapter = await response.json();
        setChapterData(chapter);
        // Load first section by default
        if (chapter.sections && chapter.sections.length > 0) {
          setSelectedSection(chapter.sections[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading chapter:', error);
    }
  };

  const loadSection = async () => {
    try {
      const response = await fetch(`/api/rules/section?book=${activeBook}&chapter=${selectedChapter}&section=${selectedSection}`);
      if (response.ok) {
        const section = await response.json();
        setSectionData(section);
      }
    } catch (error) {
      console.error('Error loading section:', error);
    }
  };

  const handleSectionClick = async (chapterId: string, sectionId: string) => {
    // First ensure the correct chapter is loaded
    if (selectedChapter !== chapterId) {
      setSelectedChapter(chapterId);
      // Load the chapter data immediately
      try {
        const response = await fetch(`/api/rules/chapter?book=${activeBook}&chapter=${chapterId}`);
        if (response.ok) {
          const chapter = await response.json();
          setChapterData(chapter);
        }
      } catch (error) {
        console.error('Error loading chapter:', error);
      }
    }
    // Then set the section
    setSelectedSection(sectionId);
  };

  const renderAttribution = () => {
    if (!bookInfo?.attribution) return null;

    const { attribution } = bookInfo;
    const hasAttribution = (attribution.editors && attribution.editors.length > 0) || 
                          (attribution.contributors && attribution.contributors.length > 0) || 
                          (attribution.proofreading && attribution.proofreading.length > 0) || 
                          (attribution.indexing && attribution.indexing.length > 0) || 
                          (attribution.reviewers && attribution.reviewers.length > 0);

    if (!hasAttribution) return null;

    return (
      <div className="mb-4 p-3 bg-[#f5e6b3] rounded-lg border border-[#bfa76a]">
        <div className="space-y-1 text-xs text-[#6b3e26]">
          {attribution.editors && attribution.editors.length > 0 && (
            <div><strong>Editors:</strong> {attribution.editors.join(', ')}</div>
          )}
          {attribution.contributors && attribution.contributors.length > 0 && (
            <div><strong>Contributors:</strong> {attribution.contributors.join(', ')}</div>
          )}
          {attribution.proofreading && attribution.proofreading.length > 0 && (
            <div><strong>Proofreading:</strong> {attribution.proofreading.join(', ')}</div>
          )}
          {attribution.indexing && attribution.indexing.length > 0 && (
            <div><strong>Indexing:</strong> {attribution.indexing.join(', ')}</div>
          )}
          {attribution.reviewers && attribution.reviewers.length > 0 && (
            <div><strong>Reviewers:</strong> {attribution.reviewers.join(', ')}</div>
          )}
        </div>
      </div>
    );
  };

  const renderIndex = () => {
    if (!bookInfo?.chapters) return null;

    return (
      <div className="mb-6">
        <div className="space-y-1">
          {bookInfo.chapters.map((chapter) => (
            <div key={chapter.id}>
              <button
                onClick={() => setSelectedChapter(chapter.id)}
                className={`w-full text-left p-2 rounded transition-colors ${
                  selectedChapter === chapter.id
                    ? 'bg-[#bfa76a] text-[#fff8e1]'
                    : 'text-[#6b3e26] hover:bg-[#e6d4a3]'
                }`}
              >
                {chapter.id}.0 {chapter.title}
              </button>
              {chapterData && selectedChapter === chapter.id && (
                <div className="ml-4 mt-1 space-y-1">
                  {chapterData.sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => handleSectionClick(chapter.id, section.id)}
                      className={`w-full text-left p-1 rounded text-sm transition-colors ${
                        selectedSection === section.id
                          ? 'bg-[#bfa76a] text-[#fff8e1]'
                          : 'text-[#6b3e26] hover:bg-[#e6d4a3]'
                      }`}
                    >
                      {section.id} {section.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (!sectionData) {
      return (
        <div className="text-center text-[#6b3e26] font-serif">
          Select a section to view content
        </div>
      );
    }

    return (
      <div className="prose prose-[#6b3e26] max-w-none">
        <h2 className="text-2xl font-bold text-[#6b3e26] mb-4">{sectionData.title}</h2>
        
        {sectionData.content && (
          <div className="mb-6 text-[#6b3e26] leading-relaxed">
            {Array.isArray(sectionData.content) ? (
              // New format: array of content objects
              sectionData.content.map((item, index) => {
                if (item.type === 'paragraph' && item.text) {
                  return item.text.split('\n\n').map((paragraph, pIndex) => (
                    <p key={`${index}-${pIndex}`} className="mb-2">{paragraph}</p>
                  ));
                } else if (item.type === 'list' && item.items) {
                  return (
                    <ul key={index} className="list-disc list-inside mb-4 space-y-1">
                      {item.items.map((listItem, lIndex) => (
                        <li key={lIndex} className="text-[#6b3e26]">{listItem}</li>
                      ))}
                    </ul>
                  );
                } else if (item.type === 'heading' && item.text) {
                  return (
                    <h3 key={index} className="text-lg font-bold text-[#6b3e26] mb-2">{item.text}</h3>
                  );
                }
                return null;
              })
            ) : (
              // Old format: string content
              sectionData.content.split('\n\n').map((paragraph, index) => (
                <p key={index} className="mb-4">{paragraph}</p>
              ))
            )}
          </div>
        )}

        {sectionData.subsections && sectionData.subsections.length > 0 && (
          <div className="space-y-6">
            {sectionData.subsections.map((subsection) => (
              <div key={subsection.id} className="border-l-4 border-[#bfa76a] pl-4">
                <h3 className="text-lg font-bold text-[#6b3e26] mb-2">{subsection.title}</h3>
                <div className="text-[#6b3e26] leading-relaxed">
                  {Array.isArray(subsection.content) ? (
                    // New format: array of content objects
                    subsection.content.map((item, index) => {
                      if (item.type === 'paragraph' && item.text) {
                        return item.text.split('\n\n').map((paragraph, pIndex) => (
                          <p key={`${index}-${pIndex}`} className="mb-2">{paragraph}</p>
                        ));
                      } else if (item.type === 'list' && item.items) {
                        return (
                          <ul key={index} className="list-disc list-inside mb-4 space-y-1">
                            {item.items.map((listItem, lIndex) => (
                              <li key={lIndex} className="text-[#6b3e26]">{listItem}</li>
                            ))}
                          </ul>
                        );
                      } else if (item.type === 'heading' && item.text) {
                        return (
                          <h4 key={index} className="text-md font-bold text-[#6b3e26] mb-2">{item.text}</h4>
                        );
                      }
                      return null;
                    })
                  ) : (
                    // Old format: string content
                    subsection.content.split('\n\n').map((paragraph, index) => (
                      <p key={index} className="mb-2">{paragraph}</p>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6ecd6] flex items-center justify-center">
        <div className="text-[#6b3e26] font-serif">Loading rules...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6ecd6] flex flex-col font-serif">
      {/* Header Bar */}
      <header className="bg-[#6b3e26] text-[#f6ecd6] py-4 px-6 shadow-lg border-b-4 border-[#bfa76a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-[#fff8e1]">
              Knowledge Base - {bookInfo?.title || 'Loading...'}
              {bookInfo?.subtitle && (
                <span className="text-lg font-normal italic text-[#e7d3a1] ml-2">
                  {bookInfo.subtitle}
                </span>
              )}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={activeBook}
              onChange={(e) => setActiveBook(e.target.value)}
              className="bg-[#fff8e1] text-[#6b3e26] px-3 py-1 rounded border border-[#bfa76a] focus:outline-none focus:ring-2 focus:ring-[#bfa76a]"
            >
              {books.map((book) => (
                <option key={book} value={book}>
                  {book.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex">
        {/* Left Panel */}
        <aside className="w-80 bg-[#f5e6b3] border-r border-[#bfa76a] p-6 overflow-y-auto">
          {renderAttribution()}
          
          {/* Search Box */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search rules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-[#bfa76a] rounded bg-[#fff8e1] text-[#6b3e26] focus:outline-none focus:ring-2 focus:ring-[#bfa76a]"
            />
          </div>

          {renderIndex()}
        </aside>

        {/* Right Panel - Content */}
        <section className="flex-1 p-8 overflow-y-auto">
          {renderContent()}
        </section>
      </main>
    </div>
  );
} 