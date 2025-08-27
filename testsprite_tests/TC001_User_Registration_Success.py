import asyncio
from playwright import async_api

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:5173", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # Navigate to the registration page by clicking the Sign In button or Get Started button to find registration option.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/header/div/div[2]/a/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Click the Register tab to switch to the registration form.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/div/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Fill in the registration form with username 'srajalpuri11', email, password 'test123', and confirm password 'test123'.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/div[3]/form/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('srajalpuri11')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/div[3]/form/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('srajalpuri11@example.com')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/div[3]/form/div[3]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('test123')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/div[3]/form/div[4]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('test123')
        

        # Click the 'Create Account' button to submit the registration form.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/div[3]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Change the username to a unique one and resubmit the registration form.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/div[3]/form/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('srajalpuri11_unique')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/div[3]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Verify the presence of a visible registration success confirmation message if any, and check UI responsiveness and functionality of key dashboard elements.
        await page.mouse.wheel(0, window.innerHeight)
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div[3]/div/div[3]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Assert that a registration success confirmation message is visible on the page after form submission
        success_message = frame.locator('text=Registration successful')
        assert await success_message.is_visible(), 'Registration success message should be visible'
          
        # Assert that the user is redirected to the login page or logged in automatically by checking for login page elements or dashboard elements
        login_page_indicator = frame.locator('text=Login')
        dashboard_indicator = frame.locator('text=NutriTrackAI - Smart Calorie Tracker')
        assert await (login_page_indicator.is_visible() or dashboard_indicator.is_visible()), 'User should be redirected to login page or logged in automatically'
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    