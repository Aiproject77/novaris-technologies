# Novaris Solution — Facturation, CRM & Constructeur de Survey

Ce qui a été ajouté à ton projet existant, et comment tout mettre en ligne.

**Structure du zip (à pousser sur GitHub) :**
```
dashboard.html
index.html
README.md
supabase/functions/send-invoice/index.ts
```
Le fichier `schema.sql` n'est **pas** dans ce zip — tu le colles directement dans
Supabase → SQL Editor (voir étape 1).

---

## 1. Base de données (une seule fois, dans Supabase — pas sur GitHub)

1. Va dans ton projet Supabase → **SQL Editor**.
2. Colle et exécute le contenu de `schema.sql` (fichier reçu séparément).
   → Crée les tables `invoices`, `invoice_installments`, `survey_config`, `app_settings`,
     ajoute la colonne `responses_data` à `survey_responses`, active la sécurité (RLS),
     et recrée tes 9 étapes actuelles du survey comme configuration modifiable.

---

## 2. Authentification du dashboard (important — lis ceci)

Le dashboard contient maintenant des données financières (factures, montants, courriels
clients). Comme `dashboard.html` est un simple fichier statique sans mot de passe,
n'importe qui connaissant l'URL + la clé publique pouvait auparavant tout voir/modifier.

J'ai donc ajouté un écran de connexion (Supabase Auth). Pour l'activer :

1. Supabase → **Authentication → Users → Add user** → crée ton compte
   (ex. `patrick@novaris-solution.com` + mot de passe).
2. Recharge `dashboard.html` : un écran de connexion apparaît maintenant avant le dashboard.
3. Tant qu'aucun utilisateur n'est connecté, `survey_config` reste lisible publiquement
   (pour que le survey public fonctionne), mais `invoices`, `app_settings` et la lecture/
   modification de `survey_responses` sont réservées aux utilisateurs connectés.

---

## 3. Obtenir ta clé Resend (étape par étape, en détail)

Resend est le service qui envoie réellement le courriel avec la facture PDF en pièce jointe.

### 3.1 Créer le compte
1. Va sur **https://resend.com** → clique **Sign Up**.
2. Crée ton compte avec ton courriel (ex. `patrick@novaris-solution.com` ou ton Gmail/Hotmail
   actuel, peu importe — ce n'est que pour te connecter au tableau de bord Resend).
3. Confirme ton adresse via le courriel de vérification qu'il t'envoie.

### 3.2 Vérifier ton domaine `novaris-solution.com` (nécessaire pour envoyer aux vrais clients)
Sans domaine vérifié, Resend te limite à envoyer uniquement à ta propre adresse (utile pour
tester, pas pour facturer de vrais clients). Pour lever cette limite :

1. Dans le tableau de bord Resend → menu **Domains** → **Add Domain**.
2. Entre `novaris-solution.com` → clique **Add**.
3. Resend affiche une liste d'enregistrements DNS à ajouter (généralement 3-4 lignes de type
   **MX**, **TXT** (SPF) et **TXT/CNAME** (DKIM)).
4. Va chez ton registraire de domaine (là où tu as acheté `novaris-solution.com` — GoDaddy,
   Namecheap, Cloudflare, etc.) → section **DNS** de ton domaine.
5. Ajoute chaque enregistrement affiché par Resend exactement comme indiqué (copie-colle le
   nom/host et la valeur).
6. Reviens sur Resend → clique **Verify**. La propagation DNS peut prendre de quelques
   minutes à 24-48h selon ton registraire.
7. Une fois vérifié (coche verte), tu peux envoyer depuis n'importe quelle adresse
   `@novaris-solution.com` (ex. `facturation@novaris-solution.com`).

*Si tu veux tester immédiatement sans attendre la vérification DNS*, tu peux utiliser
l'adresse `onboarding@resend.dev` fournie par défaut par Resend — mais elle n'enverra que
vers ta propre adresse de compte, pas vers tes vrais clients.

### 3.3 Créer la clé API
1. Dans le tableau de bord Resend → menu **API Keys** (dans la barre latérale).
2. Clique **Create API Key**.
3. Donne-lui un nom (ex. `novaris-solution-facturation`).
4. Permission : **Sending access** (Full access ou Sending access, les deux fonctionnent —
   Sending access est plus restreint et suffisant ici).
5. Clique **Add** → la clé s'affiche **une seule fois**, sous la forme `re_xxxxxxxxxxxxxxxx`.
   **Copie-la tout de suite** (impossible de la revoir après avoir fermé la fenêtre — il
   faudrait en recréer une nouvelle sinon).

### 3.4 Installer le CLI Supabase (si ce n'est pas déjà fait)
```bash
npm install -g supabase
supabase login          # ouvre ton navigateur pour te connecter à ton compte Supabase
supabase link --project-ref TON_PROJECT_REF   # trouve TON_PROJECT_REF dans Supabase → Project Settings → General
```

### 3.5 Déployer la fonction et enregistrer la clé
Depuis la racine du projet (là où se trouve le dossier `supabase/`) :
```bash
supabase functions deploy send-invoice
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
supabase secrets set FROM_EMAIL="Novaris Solution <facturation@novaris-solution.com>"
```
Remplace `re_xxxxxxxxxxxxxxxx` par la clé copiée à l'étape 3.3.

Si ton domaine n'est pas encore vérifié (étape 3.2 pas terminée), utilise temporairement :
```bash
supabase secrets set FROM_EMAIL="Novaris Solution <onboarding@resend.dev>"
```
et reviens changer cette valeur (puis relance uniquement la commande `secrets set`
ci-dessus — pas besoin de redéployer la fonction) une fois le domaine vérifié.

### 3.6 Vérifier que ça fonctionne
Dans le dashboard, crée une facture test avec ton propre courriel comme "courriel du client",
puis clique **Enregistrer + Envoyer**. Tu dois recevoir le courriel avec le PDF en pièce
jointe en quelques secondes. Si ça échoue, le dashboard affiche le message d'erreur retourné
par Resend (clé invalide, domaine non vérifié, etc.).

---

## 4. Ce que tu peux faire maintenant dans le dashboard

### Onglet "Factures"
- Générer un numéro de facture aléatoire (`NOV-2026-XXXXX`).
- Lier la facture à une réponse de survey (auto-remplit nom/compagnie/courriel) ou entrer
  les infos manuellement.
- Choisir un forfait (Essentiel / Croissance / Complet / Personnalisé) et cocher toutes
  les options à inclure (chatbot, portail, paiement en ligne, SEO, hébergement, etc.).
- Définir le montant, la fréquence (unique, mensuel, hebdomadaire, annuel), le nombre de
  versements, le type de paiement (virement, Interac, carte, chèque, autre) et les
  coordonnées de paiement à afficher sur la facture.
- Générer le PDF (en-tête Novaris Solution avec ton nom et adresse), le prévisualiser,
  le télécharger, ou l'envoyer directement par courriel au client via Resend.
- Voir l'historique des factures avec leur statut (brouillon / envoyée / payée) et les
  marquer comme payées.

### Métriques CRM (haut de l'onglet Factures)
- **Montant conclu** : total de toutes les factures actives.
- **Mensualités payées / à payer** : calculé à partir des versements réels de chaque
  facture récurrente.
- **Montant net** : montant encaissé moins une provision de taxes, dont le taux est
  éditable directement dans le dashboard.

### Onglet "Survey" (constructeur)
- Voir toutes les étapes et questions actuelles, groupées par étape.
- Modifier le texte, le type de champ (texte, choix unique, choix multiple, liste
  déroulante, curseur, tableau de priorité), les options, le caractère obligatoire, et
  activer/désactiver une question.
- Ajouter une nouvelle étape ou une nouvelle question à une étape existante.
- Le survey public (`index.html`) se recharge directement depuis cette configuration —
  aucune synchronisation manuelle nécessaire.

### Lecture des réponses
Chaque réponse dans l'onglet "Réponses" affiche maintenant **toutes** les réponses du
client, étape par étape, y compris les nouveaux champs personnalisés que tu ajoutes plus
tard — sans jamais faire planter une soumission (voir section technique ci-dessous).

---

## 5. Note technique — pourquoi un nouveau champ personnalisé ne cassera jamais rien

Une table Supabase a des colonnes fixes. Si le survey public tentait d'insérer une valeur
dans une colonne qui n'existe pas, l'enregistrement échouerait au complet. Pour éviter ça :

- Chaque réponse est maintenant aussi sauvegardée en entier dans une colonne `responses_data`
  (JSON), en plus des colonnes connues existantes.
- Le dashboard lit toujours `responses_data` en priorité, donc tes nouveaux champs
  personnalisés s'affichent automatiquement, sans jamais risquer une erreur d'insertion.

---

## 6. Bilinguisme

Les deux nouveaux onglets (Factures, Survey) et l'écran de connexion suivent le même
système de traduction FR/EN que le reste du dashboard (bouton FR/EN dans la barre latérale).
Le document PDF généré respecte la langue choisie pour chaque facture (`inv-lang`),
indépendamment de la langue d'affichage du dashboard.
