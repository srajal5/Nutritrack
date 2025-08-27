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
        # Navigate to the registration page by clicking 'Sign In' or 'Get Started' to find registration option.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/header/div/div[2]/a/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Click on the 'Register' tab to open the registration form.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/div/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Fill the registration form with a username, an already registered email, password, and confirm password, then submit the form.
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
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/div[3]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Test registration with a different username but the same registered email to verify email-specific error message.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/div[3]/form/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('newuser123')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/div[3]/form/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('srajalpuri11@example.com')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/div[3]/form/div[3]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('test123')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/div[3]/form/div[4]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('test123')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/div[3]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Task complete. Confirm the error message for duplicate email is appropriate and user-friendly, then finish the task.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div[3]/div/div[3]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        error_message_locator = frame.locator('text=Email is already in use')
        assert await error_message_locator.is_visible(), 'Expected error message for duplicate email is not visible'
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    