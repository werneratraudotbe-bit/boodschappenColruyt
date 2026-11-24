# Boodschappen-app koppelen aan je Google Sheet

De app leest en schrijft rechtstreeks in je sheet **BoodschappenColruyt** (tabblad *Lijst*). Daarvoor zet je één keer een klein script in die sheet. Reken op 5 minuten.

## 1. Script in de sheet zetten

1. Open de sheet **BoodschappenColruyt** op je computer.
2. Kies in het menu **Extensies → Apps Script**.
3. Wis alles in het bestand `Code.gs` en plak de inhoud van [`Code.gs`](backend/Code.gs).
4. Verander bovenaan `VERANDER-MIJ` in een eigen geheime sleutel, bv. `tomaat-fiets-1987`. Onthoud die.
5. Klik op het diskette-icoon (Opslaan).
6. Kies bovenaan de functie **test** en klik **Uitvoeren**. Google vraagt toestemming: klik *Toestemming controleren*, kies je account, dan *Geavanceerd → Ga naar … (onveilig)* en *Toestaan*. (Dat "onveilig" staat er omdat het je eigen script is dat Google niet nagekeken heeft.) Onderaan verschijnt "… producten gevonden".

## 2. Als web-app publiceren

1. Klik rechtsboven op **Implementeren → Nieuwe implementatie**.
2. Klik op het tandwiel naast *Type selecteren* en kies **Web-app**.
3. Vul in:
   - *Uitvoeren als*: **Ik**
   - *Wie heeft toegang*: **Iedereen**
4. Klik **Implementeren** en kopieer de **Web-app-URL** (die eindigt op `/exec`).

"Iedereen" is nodig zodat de app erbij kan zonder in te loggen. Zonder je geheime sleutel kan niemand je lijst lezen of aanpassen.

## 3. App installeren op je gsm

1. Open **https://werneratraudotbe-bit.github.io/boodschappenColruyt/** op je gsm (in Chrome op Android, in Safari op iPhone).
2. Plak de web-app-URL en je sleutel, en tik **Verbinden**.
3. Zet de app op je startscherm:
   - Android/Chrome: menu ⋮ → **App installeren** (of *Toevoegen aan startscherm*).
   - iPhone/Safari: deelknop → **Zet op beginscherm**.

Op een tweede toestel (bv. dat van je partner) doe je enkel stap 3.

## Zo werkt het

- **Thuis**: alle producten per kast. Tik **+** of **−** om te zetten hoeveel je nodig hebt (komt in kolom *Aantal*). Tik op een productnaam om het aan te passen of te verwijderen, en op de ronde **+** onderaan om een nieuw product toe te voegen.
- **Winkel**: enkel wat je nodig hebt, in de volgorde van de Colruyt-gangen. Tik een product aan als het in je kar ligt. Met **Klaar met winkelen** worden de aangevinkte producten weer op 0 gezet.
- **Bioplanet**: zet bij een product het vinkje *Kopen bij Bioplanet* (komt als `x` in kolom *Bioplanet*); het verschijnt dan in de Bioplanet-lijst in plaats van bij de Colruyt.
- Zonder bereik werkt de app verder; wijzigingen worden bewaard zodra je weer online bent.
- **Plaatsen**: beheer hier je kasten thuis en de gangen in de Colruyt. Toevoegen met **+**, hernoemen of verwijderen door op de naam te tikken, en de volgorde aanpassen met ↑ en ↓. Hernoem je een plaats, dan worden alle producten op die plaats mee aangepast.
- De sheet dient enkel nog als opslag; je hoeft ze niet meer te openen.

## Script later aanpassen

Pas je `Code.gs` aan, kies dan **Implementeren → Implementaties beheren → ✏️ → Versie: Nieuwe versie → Implementeren**. De URL blijft dezelfde.
