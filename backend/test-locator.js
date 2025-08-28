// Test file: backend/test-locator.js
// Run this to test the locator service directly

const locatorService = require('./src/services/locatorService');

const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
</head>
<body>
    <div class="container">
        <h1 id="main-title">Welcome to Test Page</h1>
        
        <form id="login-form" action="/login" method="post">
            <div class="form-group">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" placeholder="Enter username" required>
            </div>
            
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" placeholder="Enter password" required>
            </div>
            
            <div class="form-group">
                <button type="submit" id="submit-btn" class="btn btn-primary" data-testid="login-submit">
                    Login
                </button>
            </div>
        </form>
        
        <nav role="navigation">
            <ul>
                <li><a href="/home" role="link">Home</a></li>
                <li><a href="/about" role="link">About</a></li>
                <li><a href="/contact" role="link">Contact</a></li>
            </ul>
        </nav>
        
        <section class="content">
            <article>
                <h2>Article Title</h2>
                <p>This is some content.</p>
                <button class="btn-secondary" onclick="showMore()">Show More</button>
            </article>
        </section>
    </div>
</body>
</html>
`;

async function testLocatorGeneration() {
    try {
        console.log('🧪 Testing Locator Generation...\n');
        
        const options = {
            framework: 'selenium',
            includeAccessibility: true
        };
        
        const results = locatorService.generateLocators(testHtml, options);
        
        console.log(`✅ Successfully generated locators for ${results.length} elements\n`);
        
        results.forEach((result, index) => {
            console.log(`--- Element ${index + 1} ---`);
            console.log(`Tag: ${result.element.tag}`);
            console.log(`Text: "${result.element.text}"`);
            console.log(`Strategies (${result.strategies.length}):`);
            
            result.strategies.forEach((strategy, stratIndex) => {
                console.log(`  ${stratIndex + 1}. ${strategy.type}: ${strategy.selector}`);
                console.log(`     Score: ${strategy.totalScore} | Rank: ${strategy.rank}`);
                if (strategy.scores) {
                    console.log(`     Breakdown: U:${strategy.scores.uniqueness.toFixed(2)} S:${strategy.scores.stability.toFixed(2)} R:${strategy.scores.readability.toFixed(2)} P:${strategy.scores.performance.toFixed(2)} A:${strategy.scores.accessibility.toFixed(2)}`);
                }
            });
            
            console.log('');
        });
        
        console.log('🎉 Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testLocatorGeneration();