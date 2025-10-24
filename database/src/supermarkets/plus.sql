-- PLUS Supermarket Configuration

INSERT INTO supermarket_configs (name, name_short, url, web_identifiers)
VALUES (
    'PLUS',
    'plus',
    'https://www.plus.nl/aanbiedingen',
    '{
        "cookieDecline": ".btn-cookies-accept",
        "promotionExpireDate": ".promo-period-display",
        "productCategories": [
            "div.ThemeGrid_Container:has(h2:has-text(\"Aardappelen, groente, fruit\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Verse kant-en-klaarmaaltijden\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Vlees, kip, vis, vega\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Kaas, vleeswaren, tapas\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Zuivel, eieren, boter\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Brood, gebak, bakproducten\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Ontbijtgranen, broodbeleg, tussendoor\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Frisdrank, sappen, koffie, thee\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Wijn, bier, sterke drank\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Pasta, rijst, internationale keuken\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Soepen, conserven, sauzen, smaakmakers\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Snoep, koek, chocolade, chips, noten\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Diepvries\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Baby, drogisterij\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Huishouden\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Huisdier\"))"
        ],
        "products": "a[data-link]",
        "promotionProducts": {
            "productCategory": ["span[data-expression]"],
            "productName": [
                ".ph.plp-item-name .multiline-truncation-text span[data-expression]"
            ],
            "originalPrice": ["div.ph.product-header-price-previous span"],
            "discountPrice": [
                ".font-bold.product-header-price-integer span",
                ".font-black.product-header-price-decimals span"
            ],
            "specialDiscount": [
                "div.ph.promo-offer-label div.multiline-truncation-text span"
            ]
        }
    }'::jsonb
)
ON CONFLICT (name) DO UPDATE
SET 
    name_short = EXCLUDED.name_short,
    url = EXCLUDED.url,
    web_identifiers = EXCLUDED.web_identifiers,
    updated_at = CURRENT_TIMESTAMP;
