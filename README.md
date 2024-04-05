# SaleScraper
Go to the discount page of a grocery store, scrape the page of discounts and add them to an all discounts file.

## Install

## Execute
Build the TypeScript project:
```node
node run build
```

Run the file. This can be edited in the `package.json` file for a key-word specific reference:
```node
node dist/main.js --config path/to/your/config.json
```

## Functional description

```Gherkin
Feature: Fetch discounts

Scenario: 
    Given the discounts are renewed
    And the discounts webpage of '<grocery>' is visible
    When the current discounts are fetched
    Then the discounts are stored
    And the discount expire date is known

    Examples:
        | grocery |
        | ah      |
        | dirk    |
        | plus    | 
```

## Run as a service
Step 4: Run Your Application as a Service
To run your application as a service, especially in a production environment, you can use a process manager like PM2. PM2 can restart your app if it crashes, keep it running in the background, and start it automatically on reboot.

Install PM2 globally:
```bash
npm install pm2 -g
```
Start your application with PM2:
```bash
pm2 start dist/main.js -- path/to/your/config.json
```
To ensure your application starts on reboot, use:
```bash
pm2 startup
```
To save the current list of applications running with PM2 (so they restart on reboot), do:
```bash
pm2 save
```
This setup allows you to pass a specific JSON file as an argument to your TypeScript project running with Node.js and ensures your application runs continuously as a service using PM2.


