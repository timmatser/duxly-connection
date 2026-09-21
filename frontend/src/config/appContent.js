import JEWELLERY_DOCUMENTATION from '../content/jewelleryGuideNl.js';

/**
 * Per-client content for the Duxly Connection embedded app.
 *
 * Keyed by Shopify `client_id` (the app's API key), which the frontend already
 * knows at runtime via getApiKey() in App.jsx. This lets each custom-distribution
 * app registration show its own client-facing Documentation and "What's running"
 * landscape with NO backend/Lambda/SSM changes — it's all static, version-controlled
 * content shipped with the frontend bundle.
 *
 * To onboard a new client:
 *   1. Find the client_id in that app's shopify.app.<name>.toml.
 *   2. Add an APP_CONTENT[client_id] entry (documentation and/or landscape).
 *   3. Rebuild + redeploy the frontend (see CLAUDE.md).
 *
 * Apps without an entry fall back to DEFAULT_CONTENT (no manual/landscape, so
 * those tabs are hidden and only the Overview tab shows).
 *
 * Section schema (documentation.sections[]):
 *   { heading, body?: string[], bullets?: string[],
 *     bulletGroups?: [{ title, items: string[] }],
 *     steps?: string[], table?: { headings: string[], rows: string[][] },
 *     important?: string, why?: string }
 *
 * Integration schema (landscape.integrations[]):
 *   { name, what, source, result, status: 'active' | 'scheduled' | 'on-request' }
 */

const CLIENT_ID_VINTAGE = '15aaeb2a0727f22bf224d544483e58ef';
const CLIENT_ID_2EHANDS = '5925fb6a5a22cf0efbedc885d0d831c9';

// ---------------------------------------------------------------------------
// Vintage Jewellery & 2ehandssieraden share one client-facing manual.
// Source of truth (for maintainers): ClickUp doc 8cnw4jt-14735.
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Client-friendly landscape — "what Duxly runs for your store".
// Reassuring source → Duxly → result framing, NOT the internal technical map.
// ---------------------------------------------------------------------------
function jewelleryLandscape(stockResult) {
  return {
    intro:
      'Dit is wat Duxly automatisch voor je laat draaien. Jij werkt in de Content Manager (Airtable); Duxly zorgt dat de juiste informatie op de juiste plek terechtkomt — in Shopify, op de webshop en in de Data Hub.',
    integrations: [
      {
        name: 'Content Manager → Shopify sync',
        what: 'Productcontent die je in Airtable beheert wordt door Duxly vertaald naar het formaat dat Syncbase naar Shopify pusht.',
        source: 'Airtable Content Manager',
        result: 'Shopify productpagina’s',
        status: 'active',
      },
      {
        name: 'Voorraadsynchronisatie',
        what: 'Na orders en restocks synct voorraad van Shopify terug naar de Content Manager (match op SKU). Elke maandag draait een stock sweep.',
        source: 'Shopify voorraad',
        result: stockResult,
        status: 'active',
      },
      {
        name: 'Specificaties & filters',
        what: 'UI-/specificatievelden worden samengevoegd tot één specificatielijst op de productpagina en tot filterwaarden waarop klanten zoeken.',
        source: 'Products Metafields',
        result: 'Specs + filters op de webshop',
        status: 'active',
      },
      {
        name: 'Ringmaatopties generator',
        what: 'Voor ringproducten worden automatisch ringmaatopties met de juiste meerprijs op de productpagina gezet.',
        source: 'Ringdata (maat, materiaal, karaat)',
        result: 'Ringmaatopties op de productpagina',
        status: 'active',
      },
      {
        name: 'Vertalingen',
        what: 'Producten met de tag `translate-pending` worden vertaald via de Duxly Translation app.',
        source: 'translate-pending producten',
        result: 'Vertaalde Shopify-content',
        status: 'active',
      },
      {
        name: 'Verkoop & retouren → Data Hub',
        what: 'Orders, retouren en verkopen via andere kanalen lopen vanuit Shopify door naar de Data Hub voor dashboards en rapportages.',
        source: 'Shopify orders & retouren',
        result: 'Data Hub dashboards',
        status: 'active',
      },
      {
        name: 'Labels printen',
        what: 'Dymo/Bijoux-labels worden gegenereerd uit de product- en variantinformatie in de Content Manager.',
        source: 'Content Manager product/variant',
        result: 'Dymo/Bijoux labels',
        status: 'active',
      },
    ],
  };
}

const DEFAULT_CONTENT = {
  appId: null,
  name: null,
  documentation: null,
  landscape: null,
};

export const APP_CONTENT = {
  [CLIENT_ID_VINTAGE]: {
    appId: 'duxly-connection-vintage',
    name: 'Vintage Jewellery',
    documentation: JEWELLERY_DOCUMENTATION,
    landscape: jewelleryLandscape('Content Manager voorraad (Amsterdam/Bussum)'),
  },
  [CLIENT_ID_2EHANDS]: {
    appId: 'duxly-connection-2ehands',
    name: '2ehandssieraden',
    documentation: JEWELLERY_DOCUMENTATION,
    landscape: jewelleryLandscape('Content Manager voorraad (Monnickendam)'),
  },
};

/**
 * Returns the content entry for a given Shopify client_id, or a neutral default.
 * @param {string} clientId
 */
export function getAppContent(clientId) {
  return APP_CONTENT[clientId] || DEFAULT_CONTENT;
}

export default getAppContent;
