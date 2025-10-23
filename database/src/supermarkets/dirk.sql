-- Dirk Supermarket Configuration

INSERT INTO supermarket_configs (name, name_short, url, web_identifiers)
VALUES (
    'Dirk',
    'dirk',
    'https://www.dirk.nl/aanbiedingen',
    '{
        "cookieDecline": null,
        "promotionExpireDate": "#__nuxt > div > main > div.base-page > div:nth-child(2) > div > div > div.header-container.offers-header > div.header.mobile-margin > button.animate.calender-button.current > span.date",
        "productCategories": [
            "section:has(h2:has-text(\"Aardappelen, groente & fruit\"))",
            "section:has(h2:has-text(\"Vlees, vis & vega\"))",
            "section:has(h2:has-text(\"Zuivel & kaas\"))",
            "section:has(h2:has-text(\"Dranken, sap, koffie & thee\"))",
            "section:has(h2:has-text(\"Voorraadkast\"))",
            "section:has(h2:has-text(\"Maaltijden, salades & tapas\"))",
            "section:has(h2:has-text(\"Diepvries\"))",
            "section:has(h2:has-text(\"Kind & drogisterij\"))",
            "section:has(h2:has-text(\"Huishoud & huisdieren\"))",
            "section:has(h2:has-text(\"Snacks & snoep\"))"
        ],
        "products": "article",
        "promotionProducts": {
            "productCategory": ["h2"],
            "productName": [".title"],
            "originalPrice": ["div.label.price-label .regular-price", "span"],
            "discountPrice": [
                ".hasEuros.price-large",
                ".price-small",
                ".price-large:not(.hasEuros)"
            ],
            "specialDiscount": [".subtitle"]
        }
    }'::jsonb
)
ON CONFLICT (name) DO UPDATE
SET 
    name_short = EXCLUDED.name_short,
    url = EXCLUDED.url,
    web_identifiers = EXCLUDED.web_identifiers,
    updated_at = CURRENT_TIMESTAMP;
