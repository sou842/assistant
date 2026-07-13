async function workflow(browser, inputs) {
    const contactName = inputs.contactName;
    const message = inputs.message;

    if (!contactName) {
        return { success: false, error: "Missing mandatory input: 'contactName'" };
    }
    if (!message) {
        return { success: false, error: "Missing mandatory input: 'message'" };
    }

    console.log(`[Jarvis Workflow] Starting WhatsApp message send to: ${contactName}`);
    
    // 1. Navigate to or get existing WhatsApp Web page
    let page = await browser.getPage("web.whatsapp.com");
    if (!page) {
        page = await browser.newPage("https://web.whatsapp.com");
    }

    // 2. Wait for WhatsApp to load (search bar appears)
    const searchInput = page.locator("[aria-label='Search or start a new chat']");
    await searchInput.waitFor({ timeout: 20000 }); // WhatsApp can take a bit to sync/load

    // 3. Search for the contact
    console.log(`Searching for contact: ${contactName}`);
    // Clear and type the contact name + Enter
    await searchInput.type(contactName + "\n");
    await page.waitForTimeout(1500); // Wait for search results to process

    // 4. Find the contact in the results list and click it
    // Wait for the specific contact to appear
    const contactElement = page.locator(`span.x1iyjqo2[title="${contactName}"], span[title="${contactName}"]`);
    await contactElement.waitFor({ timeout: 5000 }).catch(() => console.log("Specific contact title locator timed out, attempting generic click..."));
    
    try {
        await contactElement.click();
    } catch (e) {
        // Fallback to pressing Enter if the search result auto-highlighted it
        await page.keyboard.press("Enter");
    }
    
    await page.waitForTimeout(1000); // Wait for chat to open

    // 5. Clear the search field (click Cancel search)
    const closeSearchBtn = page.locator("button[aria-label='Cancel search']");
    try {
        await closeSearchBtn.click();
        await page.waitForTimeout(500);
    } catch (e) {
        // Ignore if button not found
    }

    // 6. Find the message compose box
    console.log("Locating message compose box...");
    const messageInput = page.locator("div[contenteditable='true'][data-testid='conversation-compose-box-input']");
    await messageInput.waitFor({ timeout: 5000 });

    // 7. Type the message
    console.log("Typing message...");
    await messageInput.fill(""); // clear first
    await messageInput.type(message);
    
    await page.waitForTimeout(500);

    // 8. Click the Send button
    console.log("Clicking Send...");
    const sendButton = page.locator("button[aria-label='Send'], span[data-testid='send']");
    await sendButton.waitFor({ timeout: 2000 });
    await sendButton.click();

    // Wait a brief moment for the message to be sent
    await page.waitForTimeout(1500);

    return { 
        success: true, 
        message: `WhatsApp message successfully sent to ${contactName}!` 
    };
}
