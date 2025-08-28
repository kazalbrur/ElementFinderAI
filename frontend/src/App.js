import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Code,
  Copy,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Settings,
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
  const [activeMainTab, setActiveMainTab] = useState('locators'); // New main tab state
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [framework, setFramework] = useState('selenium');
  const [includeAccessibility, setIncludeAccessibility] = useState(true);
  const [url, setUrl] = useState('');
  const [html, setHtml] = useState('');
  const [verificationResults, setVerificationResults] = useState({});
  const [copiedItem, setCopiedItem] = useState(null);
  const [expandedElements, setExpandedElements] = useState(new Set());
  
  // Script generation state
  const [scriptGeneration, setScriptGeneration] = useState({
    language: 'python',
    testType: 'basic',
    testName: 'GeneratedTest',
    baseUrl: '',
    actions: [],
    includePageObject: true,
    includeTestData: true,
    selectedElements: new Set()
  });
  const [generatedScripts, setGeneratedScripts] = useState(null);
  const [scriptLoading, setScriptLoading] = useState(false);

  const fileInputRef = useRef();

  const frameworks = [
    { id: 'selenium', name: 'Selenium', icon: '🔧' },
    { id: 'playwright', name: 'Playwright', icon: '🎭' },
    { id: 'cypress', name: 'Cypress', icon: '🌲' }
  ];

  const languages = [
    { id: 'python', name: 'Python', icon: '🐍' },
    { id: 'javascript', name: 'JavaScript', icon: '📜' },
    { id: 'java', name: 'Java', icon: '☕' },
    { id: 'typescript', name: 'TypeScript', icon: '📘' }
  ];

  const testTypes = [
    { id: 'basic', name: 'Basic Test', description: 'Simple navigation and interaction' },
    { id: 'login', name: 'Login Test', description: 'Authentication flow testing' },
    { id: 'form', name: 'Form Test', description: 'Form submission and validation' },
    { id: 'navigation', name: 'Navigation Test', description: 'Site navigation testing' },
    { id: 'search', name: 'Search Test', description: 'Search functionality testing' },
    { id: 'e2e', name: 'End-to-End', description: 'Complete user journey testing' }
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
        setScriptGeneration(prev => ({ ...prev, baseUrl: url }));
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

  const generateTestScript = useCallback(async () => {
    if (!results || !results.locators || results.locators.length === 0) {
      setError('No locators available for script generation');
      return;
    }

    setScriptLoading(true);
    setError(null);

    try {
      const selectedLocators = scriptGeneration.selectedElements.size > 0 
        ? results.locators.filter((_, index) => scriptGeneration.selectedElements.has(index))
        : results.locators;

      const response = await fetch(`${API_BASE}/scripts/generate-test-suite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locators: selectedLocators,
          framework,
          language: scriptGeneration.language,
          testName: scriptGeneration.testName,
          baseUrl: scriptGeneration.baseUrl,
          actions: scriptGeneration.actions,
          includePageObject: scriptGeneration.includePageObject,
          includeTestData: scriptGeneration.includeTestData,
          testTypes: [scriptGeneration.testType]
        })
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedScripts(data.data);
        setActiveMainTab('scripts');
      } else {
        setError(data.error?.message || 'Script generation failed');
      }
    } catch (err) {
      setError('Failed to generate script');
    }
    setScriptLoading(false);
  }, [results, scriptGeneration, framework]);

  const copyToClipboard = useCallback(async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(id);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const downloadScript = useCallback((script, filename) => {
    const blob = new Blob([script.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const toggleElementSelection = (index) => {
    const newSelected = new Set(scriptGeneration.selectedElements);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setScriptGeneration(prev => ({ ...prev, selectedElements: newSelected }));
  };

  const toggleElementExpansion = (index) => {
    const newExpanded = new Set(expandedElements);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedElements(newExpanded);
  };

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
                <p className="text-sm text-gray-600">AI-powered web element finder and test script generator</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {generatedScripts && (
                <button
                  onClick={() => {
                    const scripts = generatedScripts.testScripts || [];
                    scripts.forEach((script, index) => {
                      downloadScript(script, `test_${index + 1}.${scriptGeneration.language === 'python' ? 'py' : 'js'}`);
                    });
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Scripts</span>
                </button>
              )}
              {results && (
                <button
                  onClick={exportResults}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Locators</span>
                </button>
              )}
            </div>
          </div>

          {/* Main Navigation Tabs */}
          <div className="mt-6 border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveMainTab('locators')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeMainTab === 'locators'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Target className="w-4 h-4 inline mr-2" />
                Locator Generation
              </button>
              <button
                onClick={() => setActiveMainTab('scripts')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeMainTab === 'scripts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Code className="w-4 h-4 inline mr-2" />
                Script Generation
              </button>
            </nav>
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

              {/* Script Generation Configuration */}
              {activeMainTab === 'scripts' && results && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    Script Generation Settings
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Language Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Programming Language
                      </label>
                      <select
                        value={scriptGeneration.language}
                        onChange={e => setScriptGeneration(prev => ({ ...prev, language: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {languages.map(lang => (
                          <option key={lang.id} value={lang.id}>
                            {lang.icon} {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Test Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Test Type
                      </label>
                      <select
                        value={scriptGeneration.testType}
                        onChange={e => setScriptGeneration(prev => ({ ...prev, testType: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {testTypes.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Test Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Test Name
                      </label>
                      <input
                        type="text"
                        value={scriptGeneration.testName}
                        onChange={e => setScriptGeneration(prev => ({ ...prev, testName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Options */}
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={scriptGeneration.includePageObject}
                          onChange={e => setScriptGeneration(prev => ({ ...prev, includePageObject: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Include Page Object Model</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={scriptGeneration.includeTestData}
                          onChange={e => setScriptGeneration(prev => ({ ...prev, includeTestData: e.target.checked }))}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Include Test Data</span>
                      </label>
                    </div>

                    <button
                      onClick={generateTestScript}
                      disabled={scriptLoading || !results}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {scriptLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      <span>{scriptLoading ? 'Generating...' : 'Generate Test Scripts'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2">
            {activeMainTab === 'locators' && (
              <>
                {results ? (
                  <div className="space-y-6">
                    {/* Results Header */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Locator Analysis Results</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Found {results.locators.length} interactive elements for {framework}
                          </p>
                          {results.url && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              {results.url}
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
                            <div className="flex items-start space-x-3 flex-1">
                              {/* Selection checkbox for script generation */}
                              <button
                                onClick={() => toggleElementSelection(elementIndex)}
                                className={`mt-1 w-4 h-4 rounded border-2 flex items-center justify-center ${
                                  scriptGeneration.selectedElements.has(elementIndex)
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                {scriptGeneration.selectedElements.has(elementIndex) && (
                                  <CheckCircle className="w-3 h-3" />
                                )}
                              </button>
                              
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
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">
                                  {element.strategies.length} strategies
                                </div>
                                <div className="text-xs text-gray-500">
                                  Best: {element.strategies[0]?.totalScore.toFixed(2) || 'N/A'}
                                </div>
                              </div>
                              <button
                                onClick={() => toggleElementExpansion(elementIndex)}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                {expandedElements.has(elementIndex) ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Strategies - Show only best strategy by default, all when expanded */}
                          <div className="space-y-3">
                            {(expandedElements.has(elementIndex) ? element.strategies : element.strategies.slice(0, 1)).map((strategy, strategyIndex) => (
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
                                {strategy.scores && expandedElements.has(elementIndex) && (
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
                          {element.context && Object.values(element.context).some(v => v) && expandedElements.has(elementIndex) && (
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
              </>
            )}

            {/* Script Generation Tab */}
            {activeMainTab === 'scripts' && (
              <>
                {generatedScripts ? (
                  <div className="space-y-6">
                    {/* Scripts Header */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Generated Test Scripts</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {framework} scripts in {scriptGeneration.language} for {scriptGeneration.testType} testing
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {generatedScripts.testScripts?.length || 0}
                          </div>
                          <div className="text-xs text-gray-500">Scripts</div>
                        </div>
                      </div>
                    </div>

                    {/* Test Scripts */}
                    {generatedScripts.testScripts?.map((script, index) => (
                      <div key={index} className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <h4 className="text-md font-semibold text-gray-900">
                              Test Script {index + 1}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => copyToClipboard(script.code, `script-${index}`)}
                                className="flex items-center space-x-2 px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                              >
                                {copiedItem === `script-${index}` ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                                <span>Copy</span>
                              </button>
                              <button
                                onClick={() => downloadScript(script, `${scriptGeneration.testName}_${index + 1}.${scriptGeneration.language === 'python' ? 'py' : 'js'}`)}
                                className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                              >
                                <Download className="w-4 h-4" />
                                <span>Download</span>
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="p-6">
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                            <code>{script.code}</code>
                          </pre>
                        </div>
                      </div>
                    ))}

                    {/* Page Object Model */}
                    {generatedScripts.pageObject && (
                      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <BookOpen className="w-5 h-5 text-purple-600" />
                              <h4 className="text-md font-semibold text-gray-900">
                                Page Object Model
                              </h4>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => copyToClipboard(generatedScripts.pageObject.code, 'page-object')}
                                className="flex items-center space-x-2 px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                              >
                                {copiedItem === 'page-object' ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                                <span>Copy</span>
                              </button>
                              <button
                                onClick={() => downloadScript(generatedScripts.pageObject, `${generatedScripts.pageObject.className}.${scriptGeneration.language === 'python' ? 'py' : 'js'}`)}
                                className="flex items-center space-x-2 px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                              >
                                <Download className="w-4 h-4" />
                                <span>Download</span>
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="p-6">
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                            <code>{generatedScripts.pageObject.code}</code>
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Test Data */}
                    {generatedScripts.testData && (
                      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Database className="w-5 h-5 text-amber-600" />
                              <h4 className="text-md font-semibold text-gray-900">
                                Test Data
                              </h4>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => copyToClipboard(typeof generatedScripts.testData.data === 'string' ? generatedScripts.testData.data : JSON.stringify(generatedScripts.testData.data, null, 2), 'test-data')}
                                className="flex items-center space-x-2 px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                              >
                                {copiedItem === 'test-data' ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                                <span>Copy</span>
                              </button>
                              <button
                                onClick={() => {
                                  const content = typeof generatedScripts.testData.data === 'string' 
                                    ? generatedScripts.testData.data 
                                    : JSON.stringify(generatedScripts.testData.data, null, 2);
                                  const blob = new Blob([content], { type: 'application/json' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = 'test_data.json';
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);
                                }}
                                className="flex items-center space-x-2 px-3 py-1 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                              >
                                <Download className="w-4 h-4" />
                                <span>Download</span>
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="p-6">
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                            <code>
                              {typeof generatedScripts.testData.data === 'string' 
                                ? generatedScripts.testData.data 
                                : JSON.stringify(generatedScripts.testData.data, null, 2)
                              }
                            </code>
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <div className="max-w-md mx-auto">
                      <Code className="w-16 h-16 text-gray-300 mx-auto mb-6" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Ready to Generate Test Scripts
                      </h3>
                      <p className="text-gray-600 mb-6">
                        First analyze a webpage to generate locators, then use the script generation feature to create complete test automation scripts with AI assistance.
                      </p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                            <Play className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-gray-600">Auto Generation</span>
                        </div>
                        <div className="text-center">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                            <BookOpen className="w-4 h-4 text-green-600" />
                          </div>
                          <span className="text-gray-600">Page Objects</span>
                        </div>
                        <div className="text-center">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                            <Database className="w-4 h-4 text-purple-600" />
                          </div>
                          <span className="text-gray-600">Test Data</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;