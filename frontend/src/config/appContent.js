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
// Source of truth (for maintainers): ClickUp doc 8cnw4jt-13735.
// ---------------------------------------------------------------------------
const JEWELLERY_DOCUMENTATION = {
  title: 'Client Handleiding',
  subtitle:
    'Dagelijks gebruik van de Shopify Content Managers, Data Hub, verkoopkanalen, voorraad, specificaties, labels, vertalingen en rapportages.',
  updated: '15 juni 2026',
  sources: [
    {
      label: 'Client Handleiding (ClickUp, NL)',
      url: 'https://app.clickup.com/9015530073/v/dc/8cnw4jt-26595/8cnw4jt-13735',
    },
    {
      label: 'Shopify CM Documentation (ClickUp)',
      url: 'https://app.clickup.com/9015530073/v/dc/8cnw4jt-26595/8cnw4jt-13715',
    },
  ],
  sections: [
    {
      heading: 'Waarvoor gebruik je dit systeem?',
      body: [
        'Vintage Jewellery en 2ehandssieraden werken met twee Shopify-webshops en Airtable Content Managers. De Content Manager is de plek waar productinformatie wordt aangemaakt en bijgehouden. Shopify is de plek waar producten worden gepubliceerd, voorraad wordt beheerd en bestellingen binnenkomen.',
      ],
      bullets: [
        'Maak en wijzig productinformatie in Airtable.',
        'Laat de synchronisatie de juiste informatie naar Shopify sturen.',
        'Gebruik Shopify als bron voor voorraad en bestellingen.',
        'Gebruik de Data Hub voor verkoopoverzichten, retouren, juweliers, dashboards, rapportages en verkopen via andere kanalen.',
      ],
      why: 'Zo blijft dagelijks productbeheer gestructureerd en hoef je niet rechtstreeks in technische Shopify-velden te werken.',
    },
    {
      heading: 'Een product aanmaken',
      body: [
        'Producten worden vanuit de Content Manager aangemaakt door een nieuwe rij toe te voegen in de Products-tab.',
      ],
      steps: [
        'Open de juiste Content Manager.',
        'Voeg het product toe in de Products-tab.',
        'Vul de basisinformatie zo compleet mogelijk in.',
        'Vul de SKU zo snel mogelijk in.',
        'Controleer Shopify na de eerste synchronisatie.',
        'Maak de productdata compleet in Products, Variants en Products Metafields voordat je publiceert.',
      ],
      important:
        'Nieuwe producten starten een product-setup-flow: inventory tracking aan, belasting rekenen uit, en eerste voorraad op de relevante locatie (Amsterdam/Bussum voor Vintage Jewellery, Monnickendam voor 2ehandssieraden). Zodra de SKU gevuld is, synct die voorraadcorrectie terug naar de Content Manager.',
      why: 'De SKU is belangrijk omdat de voorraadsynchronisatie op SKU matcht. Voorraadupdates kunnen pas betrouwbaar matchen zodra de SKU is ingevuld.',
    },
    {
      heading: 'Een product verwijderen',
      body: ['Producten moeten apart worden verwijderd in Shopify én in de Content Manager.'],
      steps: [
        'Zoek het product in Shopify.',
        'Verwijder of archiveer het product daar volgens de afgesproken werkwijze.',
        'Zoek hetzelfde product in de Content Manager.',
        'Verwijder de rij uit de Products-tab.',
        'Controleer dat het product niet meer zichtbaar is op de webshop.',
      ],
      why: 'Shopify en de Content Manager zijn gekoppeld, maar verwijderen op één plek betekent niet automatisch dat het product ook op de andere plek verdwijnt. Door beide op te schonen voorkom je oude records.',
    },
    {
      heading: 'Productinformatie aanpassen',
      body: ['Gebruik de Products-tab voor basisinformatie:'],
      bullets: [
        'Titel',
        'URL/handle',
        'Beschrijving',
        'Afbeeldingen',
        'Producttype',
        'Leverancier',
        'Shopify-tags voor collecties',
        'Status',
        'Labelprint-knoppen',
      ],
      steps: [
        'Open de juiste Content Manager en ga naar de Products-tab.',
        'Zoek het product op titel, SKU of barcode.',
        'Pas alleen velden aan die bedoeld zijn voor contentbeheer.',
        'Wacht tot de synchronisatie klaar is voordat je grote nieuwe wijzigingen doet.',
        'Controleer het product daarna in Shopify of op de webshop.',
      ],
      important:
        'Shopify-tags zijn vooral bedoeld voor collectie-gerelateerde logica. Materiaal, karaat en filterinformatie beheer je in de Content Manager/metafields, niet als losse Shopify-tags.',
      why: 'De Products-tab is bedoeld voor zichtbare basisinformatie. Sommige info die je daar ziet (zoals prijs of voorraad) komt uit andere tabs of uit Shopify en is bedoeld als overzicht.',
    },
    {
      heading: 'Prijs, SKU, barcode en voorraad aanpassen',
      body: [
        'Gebruik de Variants-tab voor variantinformatie: verkoopprijs, vergelijkingsprijs, kostprijs, SKU en barcode.',
        'Shopify is de belangrijkste invoerplek en bron van waarheid voor voorraad. Voorraadvelden in de Content Manager zijn view-only, ook als Airtable ze technisch bewerkbaar toont. Voorraad synct vanuit Shopify naar de Content Manager na orders en restocks (match op SKU). Elke maandag draait er een stock sweep om gemiste of verschoven updates te herstellen.',
      ],
      steps: [
        'Zoek het product in de Variants-tab en pas de juiste variant aan.',
        'Controleer of SKU en barcode kloppen.',
        'Beheer voorraad in Shopify volgens de afgesproken werkwijze.',
        'Controleer na synchronisatie of prijs en voorraad goed zichtbaar zijn in Shopify en de Content Manager.',
      ],
      important:
        'Als inventory tracking in Shopify uitstaat, laat de sync het Airtable-voorraadveld staan zoals het is. Overschrijf voorraad niet blind — controleer eerst waarom Shopify en Airtable verschillen.',
      why: 'Prijs, SKU, barcode en voorraad horen bij de variant. Voorraad beïnvloedt verkopen, labels en rapportages, dus er moet één duidelijke bron zijn.',
    },
    {
      heading: 'Filters en specificaties invullen',
      body: [
        'Gebruik de Products Metafields-tab voor filters, specificaties en ringmaatopties. Filters zijn waarden waarop klanten kunnen zoeken of filteren (soort, materiaal, karaat, edelsteen, kleur, stijlperiode, lengte, label, leverancier). Specificaties zijn productkenmerken op de productpagina (gewicht, afmetingen, referentienummer, keurmerk).',
      ],
      steps: [
        'Open Products Metafields en zoek het product.',
        'Vul de UI-/specificatievelden in.',
        'Vink `Submit Specs` aan als de specificaties klaar zijn.',
        'Controleer `Shopify Last Successful Update` en `Specs Last Synced`.',
        'Bij problemen: bekijk de kolom `Sync Issues`.',
      ],
      important:
        'Hernoem geen kolommen in Products Metafields, ook niet als ze niet gesynchroniseerd lijken. De converter hangt aan exacte Airtable-kolomnamen (`Submit Specs`, `Specs Last Synced`, `custom.ring_size`). Hernoemen mag alleen na een Duxly code-/configupdate.',
      why: 'Specificaties worden samengevoegd tot één zichtbare lijst op de productpagina. Synct dit te vroeg of vanuit onduidelijke input, dan kunnen klanten incomplete of verkeerde informatie zien.',
    },
    {
      heading: 'Extravelden — Ringmaatopties',
      body: [
        'Ringmaaktopties worden automatisch gegenereerd voor ringproducten, zodat klanten duidelijke opties op de productpagina zien zonder dat die per ring handmatig worden opgebouwd. De generatie hangt af van `soort UI`, prijs, `custom.ring_size`, `carat UI` en `material UI`.',
        'Het systeem maakt opties van 2 maten kleiner tot 2 maten groter (stappen van een halve maat) en kiest een prijsgroep op basis van materiaal en karaat. De eerste optie is altijd: "Mijn ringmaat staat er niet tussen, neem contact op."',
      ],
      table: {
        headings: ['Prijsgroep', 'Verkleinen 0,5–2', 'Vergroten 0,5', 'Vergroten 1', 'Vergroten 1,5', 'Vergroten 2'],
        rows: [
          ['Geel goud t/m 14 karaat', '€30', '€56', '€88', '€104', '€120'],
          ['Wit goud t/m 14 karaat', '€50', '€80', '€112', '€128', '€144'],
          ['Geel goud boven 14 karaat', '€30', '€68', '€104', '€124', '€144'],
          ['Wit goud boven 14 karaat', '€60', '€92', '€128', '€148', '€168'],
        ],
      },
      important:
        'Ringen onder €2.000 tonen de meerprijs per optie. Ringen van €2.000 of hoger tonen aanpassen als gratis service (achter de schermen €0). Kan de prijsgroep niet bepaald worden (materiaal/karaat ontbreekt), dan worden geen opties gegenereerd — controleer de kolom `Extravelden Status`. Er is een aparte view `Ringmaat - opties check`.',
      why: 'Ringmaatopties zijn klantkeuzes op de productpagina. Incomplete ringdata kan leiden tot de verkeerde prijsgroep, verkeerde meerprijs of helemaal geen opties.',
    },
    {
      heading: 'Nieuwe filterwaarden aanvragen',
      body: [
        'Nieuwe Shopify metaobject-/filterwaarden (nieuwe kleur, edelsteen, materiaal, leverancier, enz.) worden op verzoek door Duxly in de Content Manager gezet — niet automatisch. Voor deze velden moet je Duxly contacteren als je nieuwe waarden toevoegt in Shopify:',
      ],
      bulletGroups: [
        {
          title: 'Vintage Jewellery',
          items: ['soort UI', 'material UI', 'carat UI', 'gemstone UI', 'colour UI', 'style_period UI', 'length UI', 'labels UI', 'supplier UI', 'badges UI', 'extra_velden_list UI'],
        },
        {
          title: '2ehandssieraden',
          items: ['product_soort UI', 'materiaal UI', 'merk UI', 'edelsteen UI', 'kleur UI', 'custom_labels UI', 'soort UI', 'leveracier UI', 'extra_velden_list UI'],
        },
      ],
      steps: [
        'Voeg de nieuwe waarde eerst toe of bereid die voor in Shopify.',
        'Maak een lijst van de nieuwe waarden.',
        'Geef aan voor welke shop ze nodig zijn: Vintage Jewellery, 2ehandssieraden of allebei.',
        'Stuur dit naar Duxly.',
        'Wacht op bevestiging dat de waarden klaarstaan in de Content Manager en gebruik ze daarna in de UI-velden.',
      ],
      important:
        'Het leverancier-veld van 2ehandssieraden heet in Airtable exact `leveracier UI`. Verwijderde Shopify-waarden verdwijnen niet automatisch uit Airtable-dropdowns; oude opties moeten handmatig worden opgeschoond. `Sync Issues` toont ongemapte waarden.',
      why: 'De Content Manager is niet de bron voor het maken van nieuwe filteropties. Waarden moeten eerst in Shopify bestaan, daarna zet Duxly ze goed in de Content Manager.',
    },
    {
      heading: "Afbeeldingen en video's beheren",
      steps: [
        'Voeg duidelijke productfoto’s toe bij het product.',
        'Klopt de volgorde niet? Verwijder de afbeeldingen en upload ze opnieuw in de gewenste volgorde.',
        'Controleer de beeldvolgorde op de webshop.',
        'Controleer de sync-timestamp zodra alle afbeeldingen van je batch zijn gesynchroniseerd.',
        "Upload video's per product direct in Shopify.",
      ],
      why: 'Syncbase kan Shopify-afbeeldingen vanuit Airtable niet betrouwbaar herordenen. Opnieuw uploaden in de juiste volgorde is betrouwbaarder dan slepen.',
    },
    {
      heading: 'Producten vertalen',
      body: ['Vertalingen lopen via de Shopify Duxly Translation app.'],
      steps: [
        'Zorg dat de Nederlandse productinformatie definitief is.',
        'Voeg de tag `translate-pending` toe (in de Content Manager of in Shopify).',
        'Wacht tot de vertaalflow klaar is.',
        'Controleer de vertaalde versie in Shopify of op de webshop.',
        'Gebruik de Duxly Translation app als centrale plek om vertaal-statussen te beheren.',
      ],
      important:
        'Tags syncen niet twee kanten op: start je een vertaling vanuit Shopify, dan zie je die tag niet per se in de Content Manager, en andersom. Specificaties en Extra Velden vallen ook binnen de vertaalscope — pas je later NL-content aan, tag het product dan opnieuw met `translate-pending`.',
      why: 'Vertalingen worden niet automatisch opnieuw uitgevoerd bij elke tekstwijziging. De app geeft één plek om te zien wat pending, vertaald of aandacht nodig heeft.',
    },
    {
      heading: 'Labels printen',
      body: ['Gebruik de printknoppen in de Content Manager voor Dymo/Bijoux-labels.'],
      steps: [
        'Open het product in de juiste Content Manager.',
        'Controleer prijs, SKU/barcode en relevante productvelden.',
        'Controleer dat de barcode 8 tot 14 tekens lang is.',
        'Gebruik de juiste printknop.',
        'Controleer het label voordat je een grote batch print.',
      ],
      why: 'Labels gebruiken product- en variantinformatie uit de Content Manager. Klopt een label niet, controleer dan eerst prijs, SKU/barcode en barcodeformaat.',
    },
    {
      heading: 'Verkopen via andere kanalen registreren',
      body: [
        'Alle orders lopen vanuit Shopify door naar de Data Hub. Verkopen via andere kanalen registreer je ook in Shopify, met de afgesproken "Andere Kanalen"-klanten. Gebruik exact de verkoopkanaalwaarden hieronder — hoofdletters en spaties zijn belangrijk.',
      ],
      table: {
        headings: ['Shop', 'Klant', 'Verkoopkanaal'],
        rows: [
          ['Vintage', 'Catawiki Andere kanalen', 'catawiki'],
          ['Vintage', 'Veiling Andere kanalen', 'veiling'],
          ['Vintage', 'Oud goud Andere kanalen', 'oud goud'],
          ['Vintage', 'Handel Andere kanalen', 'Handel'],
          ['Vintage', 'Stammis Andere kanalen', 'Stammis'],
          ['Vintage', 'Promotie Andere kanalen', 'promotie'],
          ['Vintage', 'Marktplaats Andere kanalen', 'marktplaats vintage'],
          ['2ehands', 'Catawiki Andere kanalen', 'catawiki'],
          ['2ehands', 'Veiling Andere kanalen', 'veiling'],
          ['2ehands', 'Oud goud Andere kanalen', 'oud goud'],
          ['2ehands', 'Handel Andere kanalen', 'Handel'],
          ['2ehands', 'Stammis Andere kanalen', 'Stammis'],
          ['2ehands', 'Promotie Andere kanalen', 'promotie'],
          ['2ehands', 'Marktplaats Andere kanalen', 'marktplaats 2ehands'],
        ],
      },
      why: 'Verkopen via andere kanalen beïnvloeden voorraad, rapportage en soms juweliersuitbetalingen. Exacte kanaalwaarden voorkomen gesplitste of afgekeurde kanalen in rapportages.',
    },
    {
      heading: 'Retouren en ruilingen registreren',
      body: ['Shopify-verkopen, retouren en ruilingen worden geïmporteerd in de Data Hub.'],
      steps: [
        'Registreer de retour in Shopify.',
        'Bij een ruiling: retourneer het oorspronkelijke product en maak een nieuwe verkoop voor het vervangende product.',
        'Controleer dat het geretourneerde artikel een retourregel krijgt en het vervangende artikel een verkoopregel.',
        'Controleer daarna de rapportage in de Data Hub.',
      ],
      important:
        'Bedrag-gebaseerde gedeeltelijke refunds of kortingcorrecties worden geregistreerd als order-level adjustment records (negatieve bedragen, aantal 0), zodat rapportagetotalen kloppen zonder te doen alsof er een product is geretourneerd.',
      why: 'Retouren beïnvloeden omzet, marge, uitbetaling en voorraad. Ze moeten als retour of correctie worden geregistreerd, niet als normale handmatige verkoopcorrectie.',
    },
    {
      heading: 'Reserveringen',
      body: [
        'Reservo by United Apps wordt alleen gebruikt voor in-store/location reservations: een specifiek product voor een klant op de juiste locatie reserveren, zonder handmatige voorraadcorrecties of losse notities.',
      ],
      steps: [
        'Voeg in Shopify POS het product toe aan de cart met de klant.',
        'Maak de reservering aan via de Reservo-flow.',
        'Selecteer het juiste product/de juiste variant en de juiste locatie.',
        'Voeg klantgegevens toe of controleer ze en stel de ophaaldatum/hold period in.',
        'Werk de reservering bij als de klant ophaalt, annuleert of niet komt.',
      ],
      important:
        'Oude Lightspeed-reserveringen worden niet automatisch gemigreerd. Die moeten waar nodig handmatig worden afgerond of opnieuw aangemaakt.',
      why: 'Reserveringen zijn klantbeloftes. Een verkeerde reservering kan betekenen dat hetzelfde item twee keer wordt beloofd of te lang onbeschikbaar blijft.',
    },
    {
      heading: 'Dashboards en rapportages gebruiken',
      body: [
        'De Data Hub bevat dashboards en rapportages voor voorraad, verkoop, retouren, juweliers en investeerders.',
      ],
      steps: [
        'Open de Data Hub en kies het juiste dashboard of rapport.',
        'Controleer altijd de periode/filter bovenaan.',
        'Gebruik detailtabellen om opvallende cijfers te verklaren.',
        'Meld voorbeelden met ordernummer, SKU en juwelier als cijfers niet logisch lijken.',
      ],
      important:
        'Verwijder oude dashboardpagina’s niet bij wijzigingen. Dupliceer eerst, hernoem de oude naar `v1`/Lightspeed, verberg die en werk verder in de kopie. Bij Vintage supplier-dashboards moet de voorraadfilter producten meenemen waar Amsterdam óf Bussum voorraad heeft (niet beide eisen). `Stock is not 0` is niet genoeg — sluit waar relevant zowel `0` als `-1` uit.',
      why: 'Dashboards zijn samenvattingen. Lijkt een cijfer vreemd, dan zit de oorzaak meestal in onderliggende sales, retouren, voorraadstatus, productkoppelingen of filters.',
    },
    {
      heading: 'Synchronisatie controleren',
      body: [
        'Wijzigingen gaan niet altijd direct live; bij grotere batches kan het even duren. Syncbase doet de meeste synchronisaties van de Content Manager naar Shopify; Duxly vertaalt vooral jullie invoer naar het formaat dat Syncbase kan verwerken. Volg de sync-timestamps. Het aantal taken in de rij zie je in Shopify > Syncbase app > Status > Tasks.',
      ],
      steps: [
        'Controleer of de wijziging goed in Airtable staat.',
        'Controleer de relevante sync-timestamp.',
        'Wacht tot de wachtrij is verwerkt.',
        'Controleer Shopify en daarna de webshop.',
        'Kijk bij Sync Errors als iets niet doorkomt.',
      ],
      why: 'Airtable, Shopify en de webshop zijn aparte plekken. Een wijziging kan goed in Airtable staan, maar nog onderweg zijn naar Shopify.',
    },
    {
      heading: 'Sync Errors oplossen',
      body: ['De Sync Errors-tab toont fouten die niet automatisch konden worden verwerkt.'],
      steps: [
        'Kijk naar Sync Errors, statusvelden en timestamps.',
        'Lees de foutmelding.',
        'Los simpele fouten zelf op, zoals een dubbele handle/URL.',
        'Stuur onduidelijke fouten naar Duxly met productlink, SKU en screenshot.',
      ],
      why: 'Sync Errors zijn vaak de snelste manier om te zien waarom iets niet naar Shopify is gegaan.',
    },
    {
      heading: 'Bulk-updates doen',
      steps: [
        'Werk in kleinere batches.',
        'Pas niet honderden velden tegelijk aan als het niet nodig is.',
        'Wacht tot een batch is gesynchroniseerd voordat je de volgende start.',
        'Controleer timestamps terwijl de batch verwerkt wordt en controleer een paar voorbeelden voordat je doorgaat.',
      ],
      why: 'Elke wijziging wordt als taak verwerkt. Grote batches kunnen een wachtrij veroorzaken. Door in batches te werken voorkom je dat wijzigingen elkaar inhalen.',
    },
    {
      heading: 'Wat je beter niet doet',
      bullets: [
        'Content Manager kolommen hernoemen zonder Duxly.',
        'Technische ID-velden aanpassen.',
        'Velden aanpassen die met `custom...` of technische syncnamen beginnen, tenzij Duxly dat expliciet vraagt.',
        'Records in gesynchroniseerde tabs zomaar dupliceren of verwijderen.',
        'Afbeeldingen slepen als de volgorde kritisch is.',
        'Nieuwe technische filterwaarden direct in de Content Manager aanmaken.',
        'Voorraad corrigeren zonder eerst Shopify te controleren.',
        'Retouren als gewone verkoopcorrectie invoeren.',
        'Producttags gebruiken voor materiaal, karaat of filtermetadata.',
      ],
      why: 'Deze acties kunnen ervoor zorgen dat Shopify, Airtable, voorraad en rapportages niet meer dezelfde waarheid tonen.',
    },
    {
      heading: 'Wat je naar Duxly stuurt bij twijfel',
      body: ['Stuur altijd mee:'],
      bullets: [
        'Welke shop: Vintage Jewellery of 2ehandssieraden.',
        'Productlink of productnaam.',
        'SKU/barcode.',
        'Ordernummer als het om verkoop of retour gaat.',
        'Wat je verwachtte en wat je nu ziet.',
        'Screenshot van Airtable, Shopify of de webshop.',
        'Wanneer je de wijziging hebt gedaan.',
      ],
      why: 'Met een concreet voorbeeld kan Duxly snel zien of het probleem komt door invoer, synchronisatie, Shopify, Data Hub of rapportage.',
    },
  ],
};

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
