async function workflow(browser, inputs) {
    const isTest = inputs.test === true || inputs.test === "true";
    
    let emails = inputs.emails;
    let subject = inputs.subject;
    let body = inputs.body;
    let cc = inputs.cc || "";
    let bcc = inputs.bcc || "";

    if (isTest) {
        emails = emails || "test@example.com";
        subject = subject || "Hello from Jarvis (Test)";
        body = body || "This is an automated test message from Jarvis.";
        cc = cc || "test-cc@example.com";
        bcc = bcc || "test-bcc@example.com";
    } else {
        // Validate mandatory inputs
        if (!emails) {
            return { success: false, error: "Missing mandatory input: 'emails'" };
        }
        if (!subject) {
            return { success: false, error: "Missing mandatory input: 'subject'" };
        }
        if (!body) {
            return { success: false, error: "Missing mandatory input: 'body'" };
        }
    }

    console.log(`[Jarvis Workflow] Starting email send process... (Test Mode: ${isTest})`);
    
    // 2. Navigate to Gmail Inbox
    const page = await browser.newPage("https://mail.google.com/mail/u/0/#inbox");
    
    // 3. Wait and Click Compose Button
    const composeBtn = page.locator('.T-I.T-I-KE, div[role="button"][gh="cm"]');
    await composeBtn.waitFor({ timeout: 15000 });
    await composeBtn.click();

    // 4. Wait and Fill Recipients (To)
    const toField = page.locator('input[role="combobox"][aria-label="To recipients"], input[aria-label="To"]');
    await toField.waitFor({ timeout: 10000 });
    
    const recipients = emails.split(',').map(e => e.trim());
    for (const email of recipients) {
        if (!email) continue;
        await toField.type(email);
        await page.waitForTimeout(1000); 
    }

    // 5. Fill Cc if provided
    if (cc) {
        const ccBtn = page.locator('span[role="link"][aria-label*="cc" i], span[role="link"][data-tooltip*="cc" i]');
        await ccBtn.waitFor({ timeout: 5000 }).catch(() => console.log("Cc button not found or already open"));
        await ccBtn.click().catch(() => console.log("Failed to click Cc button (might already be open)"));
        
        const ccField = page.locator('input[role="combobox"][aria-label*="cc" i], input[aria-label*="cc" i]');
        await ccField.waitFor({ timeout: 5000 });
        const ccRecipients = cc.split(',').map(e => e.trim());
        for (const email of ccRecipients) {
            if (!email) continue;
            await ccField.type(email);
            await page.waitForTimeout(1000);
        }
    }

    // 6. Fill Bcc if provided
    if (bcc) {
        const bccBtn = page.locator('span[role="link"][aria-label*="bcc" i], span[role="link"][data-tooltip*="bcc" i]');
        await bccBtn.waitFor({ timeout: 5000 }).catch(() => console.log("Bcc button not found or already open"));
        await bccBtn.click().catch(() => console.log("Failed to click Bcc button (might already be open)"));
        
        const bccField = page.locator('input[role="combobox"][aria-label*="bcc" i], input[aria-label*="bcc" i]');
        await bccField.waitFor({ timeout: 5000 });
        const bccRecipients = bcc.split(',').map(e => e.trim());
        for (const email of bccRecipients) {
            if (!email) continue;
            await bccField.type(email);
            await page.waitForTimeout(1000);
        }
    }

    // 7. Wait and Fill Subject
    const subjectField = page.locator('input[name="subjectbox"]');
    await subjectField.waitFor({ timeout: 5000 });
    await subjectField.fill(subject);

    // 8. Wait and Fill Body
    const bodyField = page.locator('div[role="textbox"][aria-label*="Message Body"]');
    await bodyField.waitFor({ timeout: 5000 });
    await bodyField.fill(body);

    // 9. Wait and Send the Email
    const sendBtn = page.locator('.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3, div[role="button"][aria-label^="Send"]');
    await sendBtn.waitFor({ timeout: 5000 });
    await sendBtn.click();

    // Wait a brief moment for the request to fire off before completing
    await page.waitForTimeout(2000);

    return { 
        success: true, 
        message: `Email successfully sent to ${emails}!${cc ? ` (Cc: ${cc})` : ''}${bcc ? ` (Bcc: ${bcc})` : ''}` 
    };
}
