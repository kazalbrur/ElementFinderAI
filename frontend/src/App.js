import {
  AlertCircle,
  CheckCircle,
  Code,
  Copy,
  Download,
  Eye,
  FileText,
  Globe,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  Star,
  Target,
  TrendingUp,
  Upload,
  Zap
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

const API_BASE = 'http://localhost:3001/api';

const App = () => {
  const [activeTab, setActiveTab] = useState('url');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [framework, setFramework] = useState('selenium');
  const [includeAccessibility, setIncludeAccessibility] = useState(true);
  const [url, setUrl] = useState('');
  const [html, setHtml] = useState('');
  const [verificationResults, setVerificationResults] = useState({});
  const [copiedItem, setCopiedItem] = useState(null);
  const fileInputRef = useRef();

  const frameworks = [
    { id: 'selenium', name: 'Selenium', icon: '🔧' },
    { id: 'playwright', name: 'Playwright', icon: '🎭' },
    { id: 'cypress', name: 'Cypress', icon: '🌲' }
  ];

  const analyzeUrl = useCallback(async () => {
    if (!url.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/locators/analyze-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, framework, includeAccessibility })
      });
      
      const data = await response.json();
      if (data.success) {
        setResults(data.data);
      } else {
        setError(data.error?.message || 'Analysis failed');
      }
    } catch (err) {
      setError('Failed to connect to server');
    }
    setLoading(false);
  }, [url, framework, includeAccessibility]);

  const analyzeHtml = useCallback(async () => {
    if (!html.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/locators/analyze-html`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, framework, includeAccessibility })
      });
      
      const data = await response.json();
      if (data.success) {
        setResults(data.data);
      } else {
        setError(data.error?.message || 'Analysis failed');
      }
    } catch (err) {
      setError('Failed to connect to server');
    }
    setLoading(false);
  }, [html, framework, includeAccessibility]);

  const uploadFile = useCallback(async (file) => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('framework', framework);
    formData.append('includeAccessibility', includeAccessibility);

    try {
      const response = await fetch(`${API_BASE}/locators/upload-html`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        setResults(data.data);
      } else {
        setError(data.error?.message || 'Upload failed');
      }
    } catch (err) {
      setError('Failed to upload file');
    }
    setLoading(false);
  }, [framework, includeAccessibility]);

  const verifyLocator = useCallback(async (locator) => {
    if (!url) {
      setError('URL is required for verification');
      return;
    }

    const key = `${locator.selector}-${framework}`;
    setVerificationResults(prev => ({ ...prev, [key]: { loading: true } }));

    try {
      const response = await fetch(`${API_BASE}/locators/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locator: locator.selector, url, framework })
      });
      
      const data = await response.json();
      if (data.success) {
        setVerificationResults(prev => ({ 
          ...prev, 
          [key]: { ...data.data, loading: false } 
        }));
      } else {
        setVerificationResults(prev => ({ 
          ...prev, 
          [key]: { error: data.error?.message, loading: false } 
        }));
      }
    } catch (err) {
      setVerificationResults(prev => ({ 
        ...prev, 
        [key]: { error: 'Verification failed', loading: false } 
      }));
    }
  }, [url, framework]);

  const copyToClipboard = useCallback(async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(id);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const exportResults = useCallback(() => {
    if (!results) return;
    
    const exportData = {
      timestamp: new Date().toISOString(),
      framework,
      includeAccessibility,
      url: results.url,
      locators: results.locators
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `locators-${framework}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [results, framework, includeAccessibility]);

  const getStrategyIcon = (type) => {
    const icons = {
      id: '🆔',
      name: '📛',
      class: '🎨',
      css: '🎯',
      xpath: '🗺️',
      text: '📝',
      'aria-label': '♿',
      role: '🎭',
      data: '💾'
    };
    return icons[type] || '⚡';
  };

  const getConfidenceColor = (score) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceText = (score) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dynamic Locator Generator</h1>
                <p className="text-sm text-gray-600">Production-grade web element finder for test automation</p>
              </div>
            </div>
            
            {results && (
              <button
                onClick={exportResults}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Results</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-blue-600" />
                Configuration
              </h2>

              {/* Framework Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Testing Framework
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {frameworks.map(fw => (
                    <button
                      key={fw.id}
                      onClick={() => setFramework(fw.id)}
                      className={`p-3 rounded-lg border transition-all ${
                        framework === fw.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{fw.icon}</span>
                        <span className="font-medium">{fw.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accessibility Toggle */}
              <div className="mb-6">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeAccessibility}
                    onChange={e => setIncludeAccessibility(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      Include Accessibility Locators
                    </span>
                  </div>
                </label>
              </div>

              {/* Input Tabs */}
              <div className="mb-4">
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab('url')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all ${
                      activeTab === 'url'
                        ? 'bg-white shadow-sm text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span className="text-sm font-medium">URL</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('html')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all ${
                      activeTab === 'html'
                        ? 'bg-white shadow-sm text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Code className="w-4 h-4" />
                    <span className="text-sm font-medium">HTML</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('file')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all ${
                      activeTab === 'file'
                        ? 'bg-white shadow-sm text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-medium">File</span>
                  </button>
                </div>
              </div>

              {/* URL Input */}
              {activeTab === 'url' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={analyzeUrl}
                    disabled={loading || !url.trim()}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>{loading ? 'Analyzing...' : 'Analyze URL'}</span>
                  </button>
                </div>
              )}

              {/* HTML Input */}
              {activeTab === 'html' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      HTML Content
                    </label>
                    <textarea
                      value={html}
                      onChange={e => setHtml(e.target.value)}
                      placeholder="Paste your HTML content here..."
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    />
                  </div>
                  <button
                    onClick={analyzeHtml}
                    disabled={loading || !html.trim()}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Code className="w-4 h-4" />
                    )}
                    <span>{loading ? 'Analyzing...' : 'Analyze HTML'}</span>
                  </button>
                </div>
              )}

              {/* File Upload */}
              {activeTab === 'file' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      HTML File
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".html,.htm"
                      onChange={e => uploadFile(e.target.files[0])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600">
                      Select an HTML file to analyze
                    </p>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2">
            {results ? (
              <div className="space-y-6">
                {/* Results Header */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Analysis Results</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Found {results.locators.length} interactive elements for {framework}
                      </p>
                      {results.url && (
                        <p className="text-xs text-gray-500 mt-1">
                          URL: {results.url}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {results.locators.length}
                      </div>
                      <div className="text-xs text-gray-500">Elements</div>
                    </div>
                  </div>
                </div>

                {/* Elements List */}
                {results.locators.map((element, elementIndex) => (
                  <div key={elementIndex} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-6">
                      {/* Element Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-mono">
                              {element.element.tag}
                            </span>
                            {element.element.text && (
                              <span className="text-sm text-gray-600 truncate max-w-xs">
                                "{element.element.text}"
                              </span>
                            )}
                          </div>
                          {element.element.attributes.id && (
                            <div className="text-xs text-blue-600 font-mono">
                              id="{element.element.attributes.id}"
                            </div>
                          )}
                          {element.element.attributes.class && (
                            <div className="text-xs text-purple-600 font-mono">
                              class="{element.element.attributes.class}"
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {element.strategies.length} strategies
                          </div>
                          <div className="text-xs text-gray-500">
                            Best: {element.strategies[0]?.totalScore.toFixed(2) || 'N/A'}
                          </div>
                        </div>
                      </div>

                      {/* Strategies */}
                      <div className="space-y-3">
                        {element.strategies.map((strategy, strategyIndex) => (
                          <div
                            key={strategyIndex}
                            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <span className="text-lg">{getStrategyIcon(strategy.type)}</span>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-gray-900 capitalize">
                                      {strategy.type}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(strategy.totalScore)}`}>
                                      {getConfidenceText(strategy.totalScore)} ({strategy.totalScore.toFixed(2)})
                                    </span>
                                  </div>
                                  {strategyIndex === 0 && (
                                    <div className="flex items-center space-x-1 mt-1">
                                      <Star className="w-3 h-3 text-yellow-500" />
                                      <span className="text-xs text-yellow-600">Recommended</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                {activeTab === 'url' && url && (
                                  <button
                                    onClick={() => verifyLocator(strategy)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Verify locator"
                                  >
                                    {verificationResults[`${strategy.selector}-${framework}`]?.loading ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Eye className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => copyToClipboard(strategy.selector, `${elementIndex}-${strategyIndex}`)}
                                  className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Copy selector"
                                >
                                  {copiedItem === `${elementIndex}-${strategyIndex}` ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Selector */}
                            <div className="bg-gray-50 rounded-md p-3 mb-3">
                              <code className="text-sm font-mono text-gray-800 break-all">
                                {strategy.selector}
                              </code>
                            </div>

                            {/* Verification Results */}
                            {verificationResults[`${strategy.selector}-${framework}`] && (
                              <div className="mb-3">
                                {(() => {
                                  const verification = verificationResults[`${strategy.selector}-${framework}`];
                                  if (verification.error) {
                                    return (
                                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <div className="flex items-center space-x-2 text-red-700">
                                          <AlertCircle className="w-4 h-4" />
                                          <span className="text-sm">{verification.error}</span>
                                        </div>
                                      </div>
                                    );
                                  }
                                  
                                  return (
                                    <div className={`p-3 rounded-lg border ${
                                      verification.browserVerification?.found
                                        ? 'bg-green-50 border-green-200'
                                        : 'bg-red-50 border-red-200'
                                    }`}>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          {verification.browserVerification?.found ? (
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                          ) : (
                                            <AlertCircle className="w-4 h-4 text-red-600" />
                                          )}
                                          <span className={`text-sm font-medium ${
                                            verification.browserVerification?.found
                                              ? 'text-green-700'
                                              : 'text-red-700'
                                          }`}>
                                            {verification.browserVerification?.found ? 'Found' : 'Not Found'}
                                          </span>
                                        </div>
                                        <div className="flex items-center space-x-4 text-xs">
                                          {verification.browserVerification?.count && (
                                            <span>Count: {verification.browserVerification.count}</span>
                                          )}
                                          {verification.browserVerification?.isUnique !== undefined && (
                                            <span className={verification.browserVerification.isUnique ? 'text-green-600' : 'text-yellow-600'}>
                                              {verification.browserVerification.isUnique ? 'Unique' : 'Multiple'}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}

                            {/* Score Breakdown */}
                            {strategy.scores && (
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                                {Object.entries(strategy.scores).map(([key, value]) => (
                                  <div key={key} className="text-center">
                                    <div className="font-medium text-gray-600 capitalize mb-1">
                                      {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </div>
                                    <div className={`px-2 py-1 rounded ${getConfidenceColor(value)}`}>
                                      {value.toFixed(2)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Context Information */}
                      {element.context && Object.values(element.context).some(v => v) && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Context</h4>
                          <div className="flex flex-wrap gap-2">
                            {element.context.form && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                In Form
                              </span>
                            )}
                            {element.context.navigation && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                Navigation
                              </span>
                            )}
                            {element.context.section && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                In Section
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="max-w-md mx-auto">
                  <Target className="w-16 h-16 text-gray-300 mx-auto mb-6" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Ready to Generate Locators
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Enter a URL, paste HTML content, or upload an HTML file to start analyzing web elements and generate optimized locators for your test automation framework.
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-gray-600">Smart Ranking</span>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <Shield className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-gray-600">Accessibility Ready</span>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <RefreshCw className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="text-gray-600">Live Verification</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;