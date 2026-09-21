# Vintage Jewellery & 2ehandssieraden — Klantenhandleiding

Bijgewerkt: 21 september 2026

Gebaseerd op de volledige klantenhandleiding van 7 september 2026; aangevuld met de gecontroleerde opleveringen voor leveranciersvoorraad, leverancierskoppelingen, vertaalstatussen en ringmaten.

Voor het dagelijkse beheer van producten, publicatie, voorraad, verkoop, retouren, labels, vertalingen en rapportages.

Deze handleiding is gebaseerd op de nieuwste opleveringen en testresultaten die Duxly heeft gecontroleerd. Het is geen realtime controle van Shopify, Airtable of de geplande processen van vandaag. De exacte namen van Airtable-velden en Shopify-tags zijn in de oorspronkelijke taal blijven staan.

## 1\. Waar werk je?

*   **Content Manager (Airtable):** hier maak en bewerk je productinformatie, variantgegevens, filters en specificaties.
*   **Shopify:** hier beheer je voorraad, bestellingen, betalingen, retouren en de webshop.
*   **Data Hub:** hier vind je overzichten van verkopen en retouren, leveranciers/juweliers, investeerdersrapportages en voorraaddashboards.
*   **Duxly Translate Shopify-app:** hier controleer je de verwerking en status van vertalingen.

Open altijd eerst de juiste omgeving:

*   [Vintage Jewellery Content Manager](https://airtable.com/appyu7o2eGHiKsTYy)
*   [2ehandssieraden Content Manager](https://airtable.com/appJX428tAS0dcPVg)
*   [Data Hub](https://airtable.com/app1jOlCRGTVw6O50)

**Wat is er veranderd?** De eigen koppeling van Duxly tussen de Content Manager en Shopify heeft SyncBase vervangen voor het normale publiceren van producten. Tijdens de overgang in augustus stond SyncBase tijdelijk op pauze. Op **1 september 2026** gaf de klant akkoord voor de definitieve deactivering.

### Wie is waarvoor verantwoordelijk?

| Partij | Verantwoordelijkheid |
| ---| --- |
| Duxly | De Content Manager-koppeling, de synchronisatie van gegevens naar Shopify en de Data Hub-processen. |
| Shopify | Bevat de productgegevens die via de koppeling zijn ontvangen. Voorraad, bestellingen en retouren worden hier beheerd. |
| StudioRao / webshop | De visuele weergave, waaronder de Unique-banner en het tonen van winkellocaties op productpagina's. |

Staat de juiste waarde wel in Shopify, maar wordt deze verkeerd of helemaal niet op de website getoond? Leg het weergaveprobleem dan neer bij **StudioRao**. Vergelijk eerst bij hetzelfde product het exacte veld, de taal en de locatie in Shopify en op de website.

Bronnen: [akkoord op definitieve deactivering](https://duxly.slack.com/archives/C0ANRMS572N/p1788249671760109), [uitleg over verantwoordelijkheden](https://duxly.slack.com/archives/C0ANRMS572N/p1787664551862689).

## 2\. Een bestaand product bewerken en publiceren

1. Rond alle wijzigingen af in **Products**, de gekoppelde **Variants** en **Products Metafields**. In sommige instructies heet dit laatste tabblad Product Metafields.
2. Controleer het **volledige record**, inclusief alle gekoppelde varianten, prijs, btw-instelling, handle, tags en status.
3. Heb je specificaties gewijzigd? Rond dan eerst **Submit Specs** af en wacht tot het resultaat of de status is bijgewerkt.
4. Gebruik **Push to Shopify** bij het product.
5. Controleer **Shopify Push Status** en **Shopify Push Error**.
6. Controleer het resultaat zowel in **Shopify-beheer als op de website**.

Na een geslaagde push wordt het vinkje automatisch uitgezet. **Blijft het vinkje tijdelijk aanstaan, dan betekent dit niet meteen dat de koppeling kapot is.** Een grote batch kan ervoor zorgen dat latere pushes moeten wachten. Controleer de status en eventuele foutmelding en geef het proces tijd. Zet het vinkje niet steeds opnieuw aan en pas het product niet aan terwijl de push nog wordt verwerkt. Onderzoek een mislukte push via Shopify Push Error; mislukte pushes worden volgens de documentatie ieder uur opnieuw geprobeerd.

**Een push verstuurt alle beheerde productinformatie, niet alleen het veld dat je als laatste hebt aangepast.** Wijzigingen die rechtstreeks in Shopify worden gedaan aan velden die door de Content Manager worden beheerd, kunnen bij de volgende push worden overschreven.

Elk afzonderlijk Shopify-product heeft een unieke handle nodig. Binnen de normale werkwijze met één product per SKU gebruik je dus een unieke handle per SKU. Varianten die bij hetzelfde product horen, delen de handle van dat product. Dezelfde handle gebruiken voor verschillende producten blokkeert de synchronisatie. Als je een handle wijzigt, verandert ook de URL. Ga er niet van uit dat er automatisch een redirect wordt aangemaakt.

## 3\. Een nieuw product aanmaken: begin in Variants tab

Je kunt de variant en het gekoppelde product **vanuit het tabblad Variants** aanmaken met de editor voor gekoppelde records in Airtable. Voor deze eerste aanmaak hoef je dus niet tussen tabbladen te wisselen.

1. Open **Variants** in de juiste Content Manager en voeg een nieuwe regel toe.
2. Vul bij de variant **SKU, barcode, price, cost, inventory tracking en Charge tax** in. Stel voorraadtracking en btw in zoals het product bedoeld is; ga er niet automatisch van uit dat Charge tax uit moet staan.
3. Kies in het veld waarmee de variant aan een product wordt gekoppeld voor **create a new linked product**. Hiermee wordt het onderliggende record in **Products** aangemaakt.
4. Open het gekoppelde product in hetzelfde tabblad en vul **title, descriptions, tags, handle, product type en status** in. Laat de status op draft staan zolang het product nog niet compleet is.
5. Heeft het product meerdere varianten? Maak dan voor iedere variant een eigen regel in Variants en koppel deze allemaal aan **hetzelfde product**. Maak niet voor iedere variant een afzonderlijk product aan.
6. Controleer het volledige product en alle gekoppelde varianten. Gebruik daarna **Push to Shopify** bij het gekoppelde product.
7. Controleer **Shopify Push Status / Shopify Push Error** en controleer in Shopify-beheer of het product is aangemaakt.

De koppeling schrijft automatisch de **Product ID** terug naar Products en de **Product ID, Variant ID en Inventory Item ID** naar de gekoppelde Variants. Ook maakt de koppeling automatisch het bijbehorende record in **Products Metafields** en voor iedere variant een record in **Variants Metafields** aan.

De voorraadsynchronisatie wordt ook op het nieuwe product toegepast. Controleer na het aanmaken de werkelijke voorraad per Shopify-locatie en de bijbehorende kolommen in de Content Manager. De matching gebruikt **Product ID + SKU**. Dat de synchronisatie actief is, betekent niet dat iedere locatie automatisch een beginvoorraad krijgt.

Vul daarna de specificaties in **Products Metafields** in, voer **Submit Specs** uit, wacht op het resultaat en push het product opnieuw vanuit **Products**. Controleer voor publicatie ook de actieve status en verkoopkanalen en voer daarna opnieuw een push uit.

Dit is de bestaande Airtable-werkwijze met gekoppelde records zoals die aan de klant is uitgelegd. Het betekent niet dat er een aparte, op maat gemaakte interface is opgeleverd waarin alles op één scherm staat.

## 4\. Product- en variantvelden

Gebruik **Products** voor title, handle, description, images, product type, vendor, tags die met collecties te maken hebben en status.

Gebruik **Variants** voor sales price, compare-at price, cost per item, SKU, barcode, inventory tracking, Charge tax en de overige ingestelde variantvelden.

Gebruik **Products Metafields** voor de ondersteunde UI-velden, specificaties en invoer voor ringopties. Sommige uitkomsten worden door automatiseringen beheerd. Overschrijf daarom geen technische ID's, JSON of gegenereerde RAW-waarden.

Vul materiaal, karaat, edelsteen en andere filtergegevens in de daarvoor bedoelde UI- of metafieldvelden in. Maak hiervoor niet zelf nieuwe collectietags aan.

Wijzig geen kolomnamen en verwijder geen technisch ogende velden omdat ze niet gebruikt lijken te worden. De koppeling, automatiseringen of rapportages kunnen afhankelijk zijn van de exacte naam en relatie.

## 5\. Status, verkoopkanalen en publicatie

Controleer voor publicatie zowel **Status** als **Sales Channels / Region Catalogs**.

*   Stel de gewenste status in en gebruik daarna de gewone checkbox **Push to Shopify**.
*   Producten met de status draft worden pas op verkoopkanalen gepubliceerd wanneer ze active zijn.
*   Een leeg veld bij Sales Channels betekent: “laat dit veld ongewijzigd”. Het betekent niet: “verwijder het product overal”.
*   Controleer na de push **Shopify Channels Status** en **Shopify Channels Error**.
*   Gebruik bestaande keuzes uit de dropdown. Plak geen willekeurige namen of ID's in deze velden.

Nieuwe producten gebruiken de ingestelde standaardwaarden van het Content Manager-veld. Controleer deze standaardwaarden voor het betreffende product en vertrouw niet op een vaste lijst in deze handleiding.

## 6\. Filters en specificaties

1. Open het record van het product in **Products Metafields**.
2. Vul de ondersteunde UI-, filter- en specificatievelden in.
3. Zet **Submit Specs** aan zodra de specificaties compleet zijn.
4. Controleer **Specs Last Synced**, **Sync Issues** en het gegenereerde resultaat.
5. Is het resultaat gereed? Zet dan **Push to Shopify** aan bij het product.
6. Controleer de specificaties eerst in **Shopify-beheer** en daarna de zichtbare specificaties en filters op de **website**.

Submit Specs maakt de gecombineerde specificatie-inhoud klaar. Het vervangt de normale productpush niet. Als het genereren mislukt, controleer dan de invoer en status in plaats van steeds opnieuw onvolledige gegevens te versturen.

Laat de exacte veldnamen **Submit Specs**, **Specs Last Synced**, **custom.ring\_size** en andere technische namen intact. Ga er niet van uit dat ieder veld dat er in Airtable gebruiksvriendelijk uitziet rechtstreeks naar Shopify gaat. Sommige ringopties en locatiebeschikbaarheid worden nog steeds door aparte automatiseringen aangemaakt.

Maak niet zomaar een volledige metafieldregel leeg om alle Shopify-metafields te verwijderen. Het volledig leegmaken van een regel is een bekende uitzondering. Vraag Duxly om een gecontroleerde verwijdering als dit nodig is.

### Ondersteunde specificaties per shop en producttype

Welke velden worden ondersteund, hangt af van het producttype en volgt de vroegere specificatiestructuur uit Lightspeed. **Dat een veld zichtbaar is in Airtable betekent niet dat het voor ieder producttype wordt gebruikt.**

De onderstaande tabellen zijn overgenomen uit het [specificatiebestand](https://docs.google.com/spreadsheets/d/1hfNKd0CctsRzrOY9s_MyED94FUdhgLe7LXIfDn6Vrl0/edit?gid=1032727815#gid=1032727815), geraadpleegd op 7 september 2026. De oorspronkelijke namen van velden en typen zijn behouden, zodat je ze makkelijk kunt terugvinden. **✓ = ondersteund; — = expliciet niet ondersteund; ? = leeg in het bronbestand en dus niet bevestigd.** Dit zijn mappings voor de uitvoer van specificaties, geen realtime test van ieder veld. Wijzig geen Airtable-kolomnaam om een spellingsverschil in het bestand te volgen.

**Voorbeeld bij Vintage Armbanden:** volgens het bestand wordt **Specs: Afmetingen sluiting** ondersteund en gewone **Specs: Afmetingen** niet.

### Vintage Jewellery — ondersteunde specificatievelden

Typebepaling: **Soort UI**, met **Product Type** als terugvaloptie.

| Specificatieveld (naam in bron) | Manchet Knopen | Horloge | Broche | Oorbellen | Hanger | Armbanden | Kettingen | Ringen |
| ---| ---| ---| ---| ---| ---| ---| ---| --- |
| material UI | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| carat UI | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Specs: Steensoort(fallback gemstone UI) | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Specs: Lengte (fallback length UI) | — | — | ✓ | ✓ | — | ✓ | ✓ | — |
| Specs: Lengte (inclusief hangeroog) | — | — | — | — | ✓ | — | — | — |
| Specs: Afmetingen | ✓ | — | ✓ | ✓ | — | — | — | ✓ |
| Specs: Afmetingen sluiting | — | — | — | — | — | ✓ | ✓ | — |
| Specs: Kast Afmetingen | — | ✓ | — | — | — | — | — | — |
| Specs: Breedte | — | — | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Specs: Breedte scheen | — | — | — | — | — | — | — | ✓ |
| Specs: Uurwerk | — | ✓ | — | — | — | — | — | — |
| custom.brand | — | ✓ | — | — | — | — | — | — |
| Specs: Diameter binnenzijde | — | — | — | — | — | ✓ | — | — |
| Specs: Materiaal horlogeband | — | ✓ | — | — | — | — | — | — |
| Specs: Horlogeband breedte | — | ✓ | — | — | — | — | — | — |
| Specs: Model | — | ✓ | — | — | — | — | — | — |
| Specs: Referencie nummer | — | ✓ | — | — | — | — | — | — |
| Specs: Gewicht | ✓ | — | ✓ | ✓ | ? | ✓ | ✓ | ✓ |
| Specs: Keurmerk | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| custom.ring\_size | — | — | — | — | — | — | — | ✓ |

### 2ehandssieraden — ondersteunde specificatievelden

Typebepaling: **product\_soort UI**, met **Product Type** als terugvaloptie. In het bronbestand staat expliciet dat **soort UI niet bepalend is** voor deze tabel.

| Specificatieveld (naam in bron) | Overige sieraden | Kettingen | Hanger | Oorbellen | Armbanden | Ringen |
| ---| ---| ---| ---| ---| ---| --- |
| materiaal UI | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Specs: Gehalte | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Specs: Edelsteen | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Specs: Diamant | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Specs: Diameter | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Specs: Dikte | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Specs: Afmetingen | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Specs: Breedte | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Specs: Breedte scheen | — | — | — | — | — | ✓ |
| Specs: Breedte op vinger | — | — | — | — | — | ✓ |
| Specs: Lengte | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Specs: Lengte inclusief hangeroog | ✓ | — | ✓ | — | — | — |
| Specs: Gewicht | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Specs: Schakel | ✓ | ✓ | — | — | ✓ | — |
| Specs: Sluiting | ✓ | ✓ | — | — | ✓ | — |
| custom ring\_size | ✓ | — | — | — | — | ✓ |
| Specs: Keurmerk | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### Nieuwe filterwaarden

Nieuwe Shopify-metaobjectwaarden moeten zowel in de mapping als in de bijbehorende Airtable-dropdowns worden toegevoegd. Ontbreekt een optie?

1. Zoek de gewenste Shopify-waarde op.
2. Geef aan om welke shop en welk veld het gaat.
3. Vraag Duxly om de mapping en dropdown te vernieuwen.
4. Gebruik de optie pas nadat dit is bevestigd.

Vul niet zelf RAW-ID's in. Als een optie uit Shopify wordt verwijderd, verdwijnt deze niet altijd automatisch uit Airtable.

Bij 2ehandssieraden heet het leveranciersveld **leveracier UI**. Laat deze spelling staan en gebruik gewone tekst, geen HTML- of JSON-opmaak.

## 7\. Exacte regels voor het aanpassen van ringmaten: Extravelden

De **Extravelden automation** maakt voor beide shops de beschikbare ringmaten aan. Dit zijn opties waarmee een klant de ring kan laten aanpassen; het zijn geen nieuwe voorraadvarianten in Shopify.

### Benodigde invoer en voorwaarden

*   Het product moet in het juiste ringtypeveld als **Ringen** zijn ingesteld.
*   Vul één duidelijke numerieke ringmaat, prijs en materiaal in; vul bij gouden ringen ook het goudkaraat in. Een bereik, meerdere maten of een invoer met “+/-” geldt niet als één geldige maat.
*   Vintage gebruikt **material UI / carat UI**. 2ehandssieraden gebruikt het bijbehorende materiaalveld en **Specs: Gehalte**. Laat de ingestelde koppelingen tussen velden intact.
*   Het goudkaraat bepaalt de prijsgroep: **tot en met 14 karaat** of **hoger dan 14 karaat**.
*   Gehaltewaarden zoals **925, 950 en 585 mogen de karaatgroep niet bepalen**. De opgeleverde verwerking negeert deze waarden bij het lezen van het goudkaraat: **14 Karaat + 925 → tot en met 14** en **18 Karaat + 925 → hoger dan 14**. Ook de teksten “14 karaat en 925” en “950Pt en 18 karaat” van 2ehands worden ondersteund.
*   Ontbreken verplichte gegevens of kan de materiaal-/karaatgroep niet worden bepaald? Raad dan geen prijs en ga er niet vanuit dat er een optie is aangemaakt. Controleer het statuslog en verbeter de invoer.

### Gegenereerde opties

Bij een oorspronkelijke maat **s** worden de maten **s−2, s−1,5, s−1, s−0,5, s, s+0,5, s+1, s+1,5 en s+2** aangeboden. Bij iedere maat worden ook de diameter en de geschatte omtrek in millimeters getoond. De lijst bevat daarnaast een contactoptie voor een maat die er niet tussen staat. Voor de oorspronkelijke maat **s geldt altijd € 0 toeslag**.

### Prijsregels — goud in beide shops

Bij een productprijs **onder € 2.000** gelden de onderstaande bedragen, bijgewerkt op **18 mei 2026**. Het zijn vaste bedragen per gekozen maat, dus geen bedrag per halve maat dat je nog moet vermenigvuldigen.

| Materiaal / goudkaraat | 0,5–2 maten kleiner (vast bedrag) | Oorspronkelijke maat | +0,5 | +1 | +1,5 | +2 |
| ---| ---| ---| ---| ---| ---| --- |
| Geelgoud, ≤14 karaat | € 30 | € 0 | € 56 | € 88 | € 104 | € 120 |
| Witgoud, ≤14 karaat | € 50 | € 0 | € 80 | € 112 | € 128 | € 144 |
| Geelgoud, >14 karaat | € 30 | € 0 | € 68 | € 104 | € 124 | € 144 |
| Witgoud, >14 karaat | € 60 | € 0 | € 92 | € 128 | € 148 | € 168 |

### Zilver — alleen Vintage Jewellery

Voor Vintage-ringen met **material UI = Zilver** zonder goudmateriaal geldt: **€ 20** voor 0,5 tot en met 2 maten kleiner; **€ 40 / € 45 / € 50 / € 55** voor respectievelijk +0,5 / +1 / +1,5 / +2. De oorspronkelijke maat blijft € 0. Het karaat verandert de zilverprijs niet. Het product moet als Ringen zijn ingesteld en soort UI moet ring bevatten.

Ringen met zowel zilver als goud behouden de goudprijsregels. Deze zilveruitbreiding geldt niet voor 2ehandssieraden. Controleer bij tegenstrijdige materiaalgegevens eerst het materiaal; vul geen materiaal of ringmaat op basis van een vermoeden in. Bestaande zilveren ringen krijgen de opties na een relevante wijziging van prijs, ringmaat, materiaal of karaat en een volgende productpush.

Bij een productprijs van **€ 2.000 of hoger zijn alle gegenereerde opties gratis**, ook bij zilver in Vintage. In het Nederlands wordt dit getoond als **Gratis**. De oude grens van € 1.000 en de oorspronkelijke prijzen uit het bestand van maart zijn niet meer geldig.

Voorbeeld: bij een geelgouden ring van 14 karaat, met een prijs van € 1.500 en maat 17, kosten de maten 15 tot en met 16,5 € 30. Maat 17 kost € 0. De maten 17,5 / 18 / 18,5 / 19 kosten respectievelijk € 56 / € 88 / € 104 / € 120. Bij een productprijs van precies € 2.000 zijn alle negen maatkeuzes gratis.

### Genereren, controleren en publiceren

1. Vul alle verplichte ringgegevens in en wacht tot de automatisering en gekoppelde zoekvelden zijn bijgewerkt.
2. Controleer **Extra Velden Status Log**. In eerdere documentatie heet dit **Extravelden Status**. Controleer ook de gegenereerde opties en gebruik waar beschikbaar de weergave **Ringmaat - opties check**.
3. Controleer de materiaal-/karaatgroep, oorspronkelijke maat, het maatbereik en de bovenstaande prijstabel.
4. Gebruik na het genereren **Push to Shopify** bij het product.
5. Controleer de ontvangen gegevens in Shopify en daarna de keuzelijst op de website.

Oude opties voor **Inpakken als cadeau** gebruiken dezelfde opslag voor extra velden, maar horen bij cadeauverpakking en niet bij het aanpassen van ringmaten. Ga er niet vanuit dat deze producten automatisch naar het ringmaatproces zijn omgezet. Bij producten met ontbrekende informatie moeten eerst de maat, het materiaal en het karaat worden ingevuld; een bulkgeneratie kan deze gegevens niet zelf bedenken. Zijn de gegenereerde waarden in Shopify goed, maar wordt de keuzelijst verkeerd getoond op de website? Vraag StudioRao dan om de weergave te controleren.

### Controleer ook de toeslag in de winkelwagen

Een getoonde toeslag moet ook als betaalde Ringmaat-regel in de winkelwagen terechtkomen. Voor Vintage zijn op 21 september de ontbrekende prijsopties toegevoegd en is de checkout opnieuw gecontroleerd. Controleer na wijzigingen zowel de gekozen maat als het winkelwagentotaal.

Bij **2ehandssieraden** verscheen de ringmaatkeuzelijst niet op de gecontroleerde producten; de werking in de winkelwagen is daar nog niet bevestigd. Als de opties ontbreken of de toeslag niet wordt berekend, meld dit bij Duxly met de productlink, gekozen maat en screenshots van de productpagina en winkelwagen.

Bronnen: [bijgewerkte prijstabel](https://docs.google.com/spreadsheets/d/1_ExY80ekJLMIfhn0eI35OohvhqwMyv3XKC8nzSPqmOU/edit?gid=724500509#gid=724500509), [oplevering en prijstests voor beide shops](https://app.clickup.com/t/86c9v6575), [oplossingen voor opmaak, nulprijzen en karaatherkenning](https://app.clickup.com/t/86ca2bh4c). De prijzen en opgeleverde werking zijn met deze bronnen gecontroleerd; voor deze controle is de actuele automatiseringscode niet opnieuw gelezen.

## 8\. Afbeeldingen en video's

Een gewone push laat bestaande Shopify-afbeeldingen en hun volgorde staan. Heeft Shopify nog geen afbeeldingen, dan kan de koppeling deze vanuit Airtable toevoegen.

Wil je afbeeldingen bewust vervangen of de volgorde wijzigen?

1. Zet de volledige gewenste reeks afbeeldingen in de juiste volgorde in Airtable.
2. Zet **Image Override** aan. Dit is de juiste veldnaam, niet “Image Overwrite”.
3. Zet **Push to Shopify** aan.
4. Controleer daarna de volledige afbeeldingenreeks en volgorde op de website.

Image Override is bedoeld als eenmalige actie. De volledige afbeeldingenreeks in Shopify wordt vervangen door de reeks uit Airtable; het is dus niet alleen een opdracht om één extra afbeelding toe te voegen. Controleer vooraf of alle benodigde afbeeldingen in Airtable staan.

Video's die alleen in Shopify staan, blijven bij het vervangen van afbeeldingen behouden. Blijf video's rechtstreeks in Shopify uploaden.

De oude instructie om alle afbeeldingen te verwijderen en opnieuw te uploaden omdat SyncBase de volgorde niet kon aanpassen, is niet meer van toepassing.

## 9\. Vertalingen

**Gebruik translate-trigger en NIET translate-pending. De oude tag is vervallen en uit beide Content Managers verwijderd.**

1. Rond eerst de **Nederlandse brontekst** af en controleer deze, inclusief beschrijvingen en gegenereerde specificaties.
2. Voeg **translate-trigger** toe aan de beheerde producttags, of laat deze tag staan, als het product moet worden vertaald.
3. Gebruik **Push to Shopify** en controleer het resultaat van de push.
4. Geef het geplande vertaalproces tijd om te draaien. Een bulkverzoek kan langer duren; de productpush en de vertaling zijn twee afzonderlijke verwerkingsstappen.
5. Open in de juiste shop **Shopify-beheer → Apps → Duxly Translate** om de verwerking en status te controleren.
6. Controleer de vertaling eerst in Shopify en daarna in de juiste taal op de website.

De tag is een trigger om het product mee te nemen, **geen voortgangsstatus**. De vertaalapp verandert de tag niet in translate-pending en verwijdert de tag ook niet om aan te geven dat de vertaling klaar is. Het proces herkent gewijzigde brontekst en kan ongewijzigde tekst overslaan.

### Aanmelding en vertaalstatus zijn verschillende dingen

**translate-trigger** meldt een product aan voor het geplande vertaalproces. **translated:en** markeert gecontroleerd complete Engelse vertalingen en wordt door de afstemming bijgewerkt in Shopify én de Content Manager. Ook bestaande vertalingen die buiten de tool zijn gemaakt, worden beoordeeld. Voeg de voltooiingstag niet zelf toe om een vertaling als klaar te markeren.

In **Duxly Translate** betekent **Not enrolled** dat translate-trigger ontbreekt; dit bewijst niet dat de Engelse vertaling ontbreekt. Controleer de aparte status **EN: Complete, Missing of Outdated**. De oude app telt onder Not Tagged producten zonder translated:en. Die aantallen hoeven dus niet gelijk te zijn. Voeg geen triggers toe alleen om totalen gelijk te maken.

Gebruik de huidige app voor [Vintage Jewellery](https://admin.shopify.com/store/vintagejewellery-shop/apps/duxly-translate-serverless) of [2ehandssieraden](https://admin.shopify.com/store/2ehandssieraden/apps/duxly-translate-serverless). Filter in de CM op producten zonder translated:en om te controleren welke producten vertaling nodig hebben. Controleer ook de koppeling met Shopify en de actuele Engelse status. Voor een nog niet aangemeld product voeg je translate-trigger toe en gebruik je Push to Shopify.

De vertaling en het bijwerken van de voltooiingstag zijn aparte geplande stappen. Wacht op beide en controleer daarna de tag in Shopify en de CM. Bij gewijzigde Nederlandse inhoud kan de status Outdated worden; een oude tag is geen vervanging voor de actuele statuscontrole.

### Als de vertaling niet verandert

*   Controleer of de bijgewerkte **Nederlandse brontekst en de tag translate-trigger daadwerkelijk in Shopify zijn aangekomen**. Is dat niet zo, los dan eerst de productpush op via Shopify Push Error.
*   Controleer in de vertaalapp de juiste shop, het juiste product en de doeltaal. Kijk naar een eventuele wachtrij of foutmelding en geef het proces tijd om klaar te lopen.
*   Ongewijzigde brontekst kan worden overgeslagen. Dezelfde tag steeds opnieuw toevoegen bewijst niet dat er een nieuwe vertaling is gestart. Vraag Duxly om een nieuwe vertaling te regelen of te controleren als ongewijzigde tekst bewust opnieuw vertaald moet worden.
*   Staat de juiste vertaling wel in Shopify, maar niet op de website? Stuur het weergaveprobleem dan naar StudioRao.
*   Is de verwerking klaar, maar is de Shopify-vertaling nog steeds verkeerd? Stuur Duxly dan de shop, SKU, taal, brontekst, verwachte en werkelijke vertaling, het tijdstip van de push en een screenshot van de status of foutmelding.

De klant heeft gevraagd om **alle producten in beide shops opnieuw te vertalen**. In de gecontroleerde Slack-thread staat niet dat dit al is afgerond. Eenmalige aantallen onvertaalde producten zijn daarom bewust niet in deze handleiding opgenomen.

Bron: [nieuwe vertaalinstructie en verzoek om alle producten opnieuw te vertalen](https://duxly.slack.com/archives/C0ANRMS572N/p1788188214290459).

## 10\. Voorraad

Beheer de voorraad in **Shopify**. De voorraadkolommen in de Content Manager zijn alleen bedoeld om de operationele voorraad te bekijken, ook als Airtable technisch toestaat dat je erin typt.

De huidige vastgelegde voorraadlocaties zijn:

*   Vintage Jewellery Amsterdam
*   Vintage Jewellery Bussum
*   **Vintage Jewellery Haarlem**
*   2ehandssieraden: **Winkel Monnickendam**

De extra kolom voor Vintage heet **Stock available in: Vintage Jewellery Haarlem**. Haarlem komt in de verkoopkanaalrapportage van de Data Hub ook voor als **Winkel Haarlem**, naast de bestaande winkelkanalen.

Dat de voorraad in Shopify en de Content Manager klopt, betekent **niet automatisch dat de winkellocatie goed op de productpagina wordt getoond**. De weergave daarvan valt onder **StudioRao/de webshop** en staat los van de voorraadsynchronisatie.

Gebruik bij 2ehandssieraden het verouderde veld **Stock available in: 2ehandssieraden** niet voor berekeningen. De Shopify-voorraad- en waardevelden in de leveranciersrapportage zijn op 21 september aangepast naar **alleen Winkel Monnickendam**. De gezamenlijke leveranciersvelden blijven de juiste Vintage-bijdrage en 2ehands-bijdrage optellen.

Voorraadgebeurtenissen uit Shopify werken de voorraad in de Content Manager bij. Een geplande controle vangt gemiste updates op. Ontbrekende of losgekoppelde locaties worden naar nul gecorrigeerd; voorraad waarvoor tracking uitstaat, moet apart worden gecontroleerd.

Wijkt de voorraad af? Controleer dan eerst de Shopify-locatie, inventory tracking, Product ID en SKU. Probeer de weergave in de Content Manager niet te corrigeren met een handmatige voorraadaanpassing en maak geen dubbele variant aan. Vermeld bij een melding altijd de shop, SKU en locatie.

## 11\. Verkopen via andere kanalen

Registreer verkopen via andere kanalen in Shopify met de bestaande, afgesproken klant **Andere Kanalen** die bij dat kanaal hoort. De koppeling bepaalt de route aan de hand van de ingestelde klantidentiteit.

De goedgekeurde rapportagewaarden in de Data Hub zijn:

*   catawiki
*   veiling
*   oud goud
*   promotie
*   Handel
*   Stammis
*   marktplaats vintage
*   marktplaats 2ehands

Gebruik in de juiste shop de bestaande klant die bij het verkoopkanaal hoort. Maak geen nieuwe klant met een bijna dezelfde naam in de veronderstelling dat de koppeling deze automatisch herkent.

Controleer daarna de bestelling, voorraad en het veld **Verkoopkanaal** in de Data Hub. Voer dezelfde verkoop niet ook nog in via het oude Andere Kanalen-proces in de Data Hub.

## 12\. Retouren en omruilingen

Registreer retouren en terugbetalingen in Shopify en controleer daarna de bijbehorende regels in de Data Hub.

Registreer bij een omruiling zowel de retour van het oorspronkelijke product als de verkoop van het vervangende product. Controleer vervolgens beide kanten in de Data Hub. Een financiële correctie zonder geretourneerd artikel is niet hetzelfde als een voorraadretour.

Terugbetalingen die alleen uit een bedrag bestaan, worden als negatieve correctie op bestelniveau vastgelegd met aantal nul. Er wordt dus geen niet-bestaand geretourneerd product aangemaakt. Controleer omzet, aantallen en de gekozen retourlocatie apart.

Klopt iets niet? Geef dan het bestelnummer, de shop, het artikel/de SKU en het verwachte retourbedrag door. Probeer het verschil niet te compenseren met een extra handmatige verkoop- of retourregel.

## 13\. Labels en reserveringen

### Labels printen

Gebruik de bestaande Dymo/Bijoux-printknoppen in de Content Manager. Controleer eerst prijs, SKU/barcode en de productgegevens. Het vastgelegde bereik voor barcodes is 8 tot en met 14 tekens. Print eerst één testlabel voordat je een grote batch afdrukt.

### Reserveringen

De bestaande handleiding gebruikt **Reservo by United Apps** voor reserveringen in de winkel of per locatie:

1. Selecteer het product en de klant in Shopify POS.
2. Gebruik het ingestelde reserveringsproces van Reservo.
3. Controleer variant, locatie en afhaal-/vasthoudgegevens.
4. Werk de reservering bij wanneer deze wordt opgehaald, geannuleerd of verloopt.

Vervang een reservering niet door een handmatige voorraadwijziging. De schermen van de Reservo-app zijn tijdens deze controle niet opnieuw getest; volg daarom de actuele interface van de geïnstalleerde app.

## 14\. Dashboards en wekelijkse rapportages

Gebruik de interfaces in de Data Hub voor voorraad, verkopen, retouren, juweliers en investeerdersrapportages. Controleer altijd de rapportageperiode en de onderliggende detailregels.

De wekelijkse rapportage op basis van Shopify is opgeleverd en gebruikt niet langer de bevroren Lightspeed-tabellen. Het vastgelegde tijdstip is **maandag om 05:00 UTC**. Dat is 07:00 uur tijdens de Nederlandse zomertijd en 06:00 uur tijdens de wintertijd.

Bronnen voor de rapportage:

*   Vintage: voorraad van Amsterdam + Bussum + Haarlem.
*   2ehandssieraden: alleen Winkel Monnickendam.
*   Inkoopwaarde: cost per item × de voorraad die meetelt.
*   Aantallen per product/categorie tellen producten, geen locatieregels of losse voorraadeenheden.
*   Online: status active.
*   Online with Stock: active en voorraad hoger dan nul.
*   Not Online: voorraad hoger dan nul en niet active, uitgesplitst op Import Status.

“Online” is in deze rapportage een definitie op basis van de status. Het bewijst niet dat het product op ieder verkoopkanaal is gepubliceerd.

Een product met voorraad op meerdere Vintage-locaties telt de voorraad van die locaties mee, maar mag niet als meerdere producten worden geteld. Ontbrekende productkoppelingen of cost per item moeten worden gecorrigeerd voordat ruwe varianttotalen als betrouwbare rapporttotalen kunnen worden gebruikt.

De leveranciersdashboards bevatten Haarlem. Een voorraadfilter moet voorraad op minimaal één relevante locatie accepteren en mag niet eisen dat op alle locaties voorraad staat. Een negatief aantal geldt niet als beschikbare voorraad.

Wekelijkse regels zijn momentopnamen. De huidige waarden in de Content Manager kunnen daarom terecht afwijken. Historische regels uit de Lightspeed-periode zijn bewaard gebleven en sommige vroege Shopify-rapportageregels zijn gecorrigeerd of geschat. Behandel de volledige historische reeks dus niet alsof alles op precies dezelfde manier is gemeten.

Gebruik in de leveranciersoverzichten de velden met **(Shopify)** voor de actuele voorraad en voorraadwaarden. In **Juweliers met voorraad** wordt gefilterd op **Totale voorraad (Shopify) > 0** en is de oude kolom Totale voorraad verborgen. Andere weergaven kunnen nog oude, bevroren waarden tonen; die zijn niet door deze voorraadcorrectie bijgewerkt.

De gecontroleerde afwijkende leverancierskoppelingen zijn op 21 september hersteld voor beide shops. Ontbrekende productkoppelingen vallen buiten die herstelronde. Klopt een leverancierstotaal niet, controleer dan eerst de juiste Shopify-velden, de leverancier in het UI-veld en de gekoppelde Juwelier. Wijzig niet handmatig een financieel totaal om een ontbrekende of onjuiste productkoppeling te compenseren.

Laat oude leveranciers- en dashboardkolommen staan totdat er een opruiming is afgesproken. Leverancierstotalen zijn afhankelijk van geldige productkoppelingen en ingevulde leveranciers. Producten zonder leverancier kunnen buiten de leveranciersrapportage vallen.

## 15\. Veelvoorkomende fouten - snelle keuzehulp

**Begin altijd met het vergelijken van de bedoelde waarden in de Content Manager, de pushstatus en Shopify-beheer.**

*   **Fout door dubbele handle?** → Maak de handle uniek voor het Shopify-product. Binnen de normale werkwijze met één product per SKU heeft ieder product/SKU een eigen unieke handle; gekoppelde varianten van hetzelfde product delen de handle. Controleer alles en push opnieuw.
*   **Push mislukt?** → Lees eerst **Shopify Push Error**. Controleer bij publicatieproblemen ook **Shopify Channels Status / Error**. Corrigeer de genoemde invoer voordat je opnieuw probeert.
*   **Push blijft geselecteerd zonder duidelijke fout?** → Geef de wachtrij tijd, vooral na bulkwijzigingen. Een vinkje dat tijdelijk blijft staan bewijst niet dat de koppeling kapot is. Controleer eerst de status en zet het vinkje niet steeds opnieuw aan.
*   **Specificatie ontbreekt in Shopify?** → Controleer de juiste shop, het producttype en de tabel met ondersteunde velden → vul het ondersteunde veld in → voer **Submit Specs** uit → wacht op het resultaat/de status → gebruik **Push to Shopify** → controleer Shopify en de website.
*   **De waarde klopt in Shopify, maar niet op de website?** → Dan gaat het waarschijnlijk om de webshop of het thema en niet om de Content Manager-koppeling. Stuur de vergelijking tussen Shopify en de website naar **StudioRao**, inclusief taal of locatie als dat relevant is.
*   **Vertaling is niet gewijzigd?** → Volg hoofdstuk 9 en controleer eerst de bronpush en de status in de vertaalapp voordat je om een nieuwe vertaling vraagt.

Geef bij een melding altijd de **shop, SKU, productlink, verwachte uitkomst, werkelijke uitkomst, tijdstip van de push en een screenshot of foutmelding** door. Voeg waar relevant ook het bestelnummer, de locatie of de doeltaal toe.

Duxly-medewerkers kunnen het [Vintage monitoring portal](https://vintage.duxly.eu) gebruiken om de status en foutmeldingen van de synchronisatie te controleren. Hiervoor is toegang nodig. Oude SyncBase-wachtrijen zeggen niets over de huidige werking van de nieuwe koppeling.

Verwerk bulkwijzigingen in behapbare batches en controleer eerst enkele representatieve producten voordat je de volgende batch verstuurt. Wijzig geen technische ID's en verwijder of maak records niet opnieuw aan om een fout te omzeilen.

Bronnen: [dubbele handles en Shopify Push Error](https://duxly.slack.com/archives/C0ANRMS572N/p1786544205185659), [verantwoordelijkheid voor de weergave](https://duxly.slack.com/archives/C0ANRMS572N/p1787664551862689).
