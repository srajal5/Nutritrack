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
        # Click on the 'AI Coach' navigation link to open the AI Coach chat interface.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/header/div/nav/a[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Input username and password, then click Sign In to access AI Coach chat interface.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/div[2]/form/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('srajalpuri11')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/div[2]/form/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('test123')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div/div[2]/div[2]/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Click on the 'AI Assistant' button to open the AI Coach chat interface.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/main/div/div[2]/div/button[4]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Dismiss the cookie consent popup by clicking 'Accept All' to avoid interference, then input the first nonsensical query.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div[3]/div/div[3]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Input the first nonsensical query 'asdkjfhqwe' into the AI chat input and submit it.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/main/div/div[2]/div[2]/div/div/div/div/div/div[2]/div[2]/form/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('asdkjfhqwe')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/main/div/div[2]/div[2]/div/div/div/div/div/div[2]/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Input the second irrelevant query 'What is the meaning of life?' into the AI chat input and submit it.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/main/div/div[2]/div[2]/div/div/div/div/div/div[2]/div[2]/form/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('What is the meaning of life?')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/main/div/div[2]/div[2]/div/div/div/div/div/div[2]/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Input the third irrelevant query 'Tell me a joke about broccoli' into the AI chat input and submit it.
        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/main/div/div[2]/div[2]/div/div/div/div/div/div[2]/div[2]/form/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Tell me a joke about broccoli')
        

        frame = context.pages[-1]
        elem = frame.locator('xpath=html/body/div/div/div[2]/main/div/div[2]/div[2]/div/div/div/div/div/div[2]/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # Verify AI Coach responds politely indicating lack of understanding or redirects to help resources for the first nonsensical query.
        response_locator = frame.locator('xpath=html/body/div/div/div[2]/main/div/div[2]/div[2]/div/div/div/div/div/div[2]/div[1]/div[last()]')
        response_text = await response_locator.inner_text()
        assert any(phrase in response_text.lower() for phrase in ['sorry', 'don\'t understand', 'not sure', 'help', 'redirect', 'can you rephrase', 'apologize']), f"Unexpected AI response to nonsensical query: {response_text}"
          
        # Verify AI Coach responds politely indicating lack of understanding or redirects to help resources for the second irrelevant query.
        response_text_2 = await response_locator.inner_text()
        assert any(phrase in response_text_2.lower() for phrase in ['sorry', 'don\'t understand', 'not sure', 'help', 'redirect', 'can you rephrase', 'apologize']), f"Unexpected AI response to irrelevant query: {response_text_2}"
          
        # Verify AI Coach responds politely indicating lack of understanding or redirects to help resources for the third irrelevant query.
        response_text_3 = await response_locator.inner_text()
        assert any(phrase in response_text_3.lower() for phrase in ['sorry', 'don\'t understand', 'not sure', 'help', 'redirect', 'can you rephrase', 'apologize']), f"Unexpected AI response to irrelevant query: {response_text_3}"
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    