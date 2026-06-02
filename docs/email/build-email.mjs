import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR = path.resolve(__dirname, "images");
const OUT = path.resolve(__dirname, "presentation-clos-verde.html");

function dataUri(file) {
	const buf = fs.readFileSync(path.join(IMG_DIR, file));
	return `data:image/png;base64,${buf.toString("base64")}`;
}

const calendrier = dataUri("01-calendrier.png");
const reserver = dataUri("02-reserver.png");
const classement = dataUri("03-classement.png");
const messages = dataUri("04-messages.png");
const tickets = dataUri("05-tickets.png");
const faq = dataUri("06-faq.png");
const avis = dataUri("07-avis.png");

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Clos Verde — notre nouvel espace en ligne</title>
</head>
<body style="margin:0;padding:0;background:#f3efe7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1f2a24;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3efe7;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(31,42,36,0.08);">

        <!-- HEADER -->
        <tr>
          <td style="background:#2e5e4e;padding:28px 32px;color:#ffffff;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:22px;font-weight:700;letter-spacing:0.3px;color:#ffffff;">Clos Verde</td>
                <td align="right" style="font-size:13px;color:#cfe1d6;">Gestion de la place partagée</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- INTRO -->
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h1 style="margin:0 0 14px 0;font-size:24px;line-height:1.25;color:#1f2a24;font-weight:700;">Bonjour à toutes et à tous,</h1>
            <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#384a40;">
              J'ai le plaisir de vous présenter <strong>Clos Verde</strong>, notre espace en ligne pour simplifier la vie du clos au quotidien&nbsp;: consulter les réservations, réserver la place commune, suivre le classement, discuter ensemble et envoyer vos retours à l'équipe.
            </p>
            <p style="margin:0 0 0 0;font-size:15px;line-height:1.6;color:#384a40;">
              Voici les fonctionnalités principales, avec des captures reprises de l'application actuelle.
            </p>
          </td>
        </tr>

        <!-- SECTION 1 — CALENDRIER -->
        <tr>
          <td style="padding:28px 32px 8px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-left:4px solid #2e5e4e;padding-left:14px;">
                  <h2 style="margin:0 0 6px 0;font-size:18px;color:#1f2a24;font-weight:700;">1. Le calendrier, d'un coup d'œil</h2>
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#445a4f;">
                    Le premier écran affiche le calendrier mensuel. Vos réservations apparaissent en bleu, celles des autres copropriétaires en vert, et le jour courant est encadré. Le bouton <strong>Réserver un jour</strong> ouvre le formulaire de réservation, tandis que l'onglet <strong>Classement</strong> donne accès au cumul des jours réservés.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 32px 4px 32px;" align="center">
            <img src="${calendrier}" alt="Vue calendrier mensuelle de Clos Verde" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:1px solid #e1dbd0;border-radius:8px;" />
          </td>
        </tr>

        <!-- SECTION 2 — RESERVER -->
        <tr>
          <td style="padding:28px 32px 8px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-left:4px solid #2e5e4e;padding-left:14px;">
                  <h2 style="margin:0 0 6px 0;font-size:18px;color:#1f2a24;font-weight:700;">2. Réserver la place&nbsp;: un formulaire simple</h2>
                  <p style="margin:0 0 10px 0;font-size:14px;line-height:1.6;color:#445a4f;">
                    Par défaut, la réservation couvre la journée entière. Si vous avez seulement besoin d'un créneau, cochez <strong>Préciser les heures de début et de fin</strong>. Choisissez ensuite les dates, ajoutez une note si nécessaire, puis cliquez sur <strong>Confirmer la réservation</strong>.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 32px 4px 32px;" align="center">
            <img src="${reserver}" alt="Formulaire de réservation Clos Verde" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:1px solid #e1dbd0;border-radius:8px;" />
          </td>
        </tr>

        <!-- WORKFLOW STEPS -->
        <tr>
          <td style="padding:18px 32px 4px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f4ee;border-radius:10px;">
              <tr>
                <td style="padding:18px 20px;">

                  <!-- Étape 1 -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td valign="top" width="36" style="padding:2px 12px 0 0;">
                        <div style="width:28px;height:28px;border-radius:50%;background:#e8a23a;color:#ffffff;font-weight:700;font-size:14px;line-height:28px;text-align:center;">1</div>
                      </td>
                      <td valign="top">
                        <p style="margin:0 0 4px 0;font-size:14px;color:#1f2a24;font-weight:700;">Réservation déposée — <span style="color:#a86a00;">en attente</span></p>
                        <p style="margin:0;font-size:13px;line-height:1.55;color:#5a6b62;">
                          Dès que vous validez le formulaire, votre réservation est enregistrée avec le statut <strong>En attente</strong>. Elle apparaît immédiatement sur le calendrier de tout le clos.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- séparateur -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px dashed #d8d0bf;line-height:0;font-size:0;height:1px;padding:14px 0 0 0;">&nbsp;</td></tr></table>

                  <!-- Étape 2 -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
                    <tr>
                      <td valign="top" width="36" style="padding:2px 12px 0 0;">
                        <div style="width:28px;height:28px;border-radius:50%;background:#c0533c;color:#ffffff;font-weight:700;font-size:14px;line-height:28px;text-align:center;">2</div>
                      </td>
                      <td valign="top">
                        <p style="margin:0 0 4px 0;font-size:14px;color:#1f2a24;font-weight:700;">Délai d'opposition pour les voisins</p>
                        <p style="margin:0;font-size:13px;line-height:1.55;color:#5a6b62;">
                          Pendant un court délai après le dépôt (par défaut 1&nbsp;heure, ou jusqu'à la date de début si elle est plus proche), tout copropriétaire peut <strong>s'opposer</strong> à la réservation s'il a un conflit. L'objection ouvre une discussion dédiée pour en parler ensemble et trouver un arrangement.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- séparateur -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px dashed #d8d0bf;line-height:0;font-size:0;height:1px;padding:14px 0 0 0;">&nbsp;</td></tr></table>

                  <!-- Étape 3 -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
                    <tr>
                      <td valign="top" width="36" style="padding:2px 12px 0 0;">
                        <div style="width:28px;height:28px;border-radius:50%;background:#2e8c66;color:#ffffff;font-weight:700;font-size:14px;line-height:28px;text-align:center;">3</div>
                      </td>
                      <td valign="top">
                        <p style="margin:0 0 4px 0;font-size:14px;color:#1f2a24;font-weight:700;">Validation automatique</p>
                        <p style="margin:0;font-size:13px;line-height:1.55;color:#5a6b62;">
                          Si <strong>aucune objection</strong> n'a été déposée à la fin du délai, la réservation passe d'elle-même en <strong style="color:#1f6b4d;">Validée</strong>. Vous n'avez rien à faire&nbsp;: la place est à vous, et tout le monde le voit sur le calendrier.
                        </p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>
            <p style="margin:14px 4px 0 4px;font-size:13px;line-height:1.55;color:#6a7a72;font-style:italic;">
              Vous pouvez modifier ou annuler votre propre réservation depuis son détail dans le calendrier. Si quelqu'un s'y oppose, la conversation associée apparaît dans Messages.
            </p>
          </td>
        </tr>

        <!-- SECTION 3 — CLASSEMENT -->
        <tr>
          <td style="padding:28px 32px 8px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-left:4px solid #2e5e4e;padding-left:14px;">
                  <h2 style="margin:0 0 6px 0;font-size:18px;color:#1f2a24;font-weight:700;">3. Le classement, pour partager équitablement</h2>
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#445a4f;">
                    Le classement liste les copropriétaires avec leur nombre de réservations et le total de jours cumulés. Il n'impose pas de quota&nbsp;: il sert surtout de repère commun pour garder une utilisation équilibrée de la place.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 32px 4px 32px;" align="center">
            <img src="${classement}" alt="Classement des réservations Clos Verde" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:1px solid #e1dbd0;border-radius:8px;" />
          </td>
        </tr>

        <!-- SECTION 4 — MESSAGES -->
        <tr>
          <td style="padding:28px 32px 8px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-left:4px solid #2e5e4e;padding-left:14px;">
                  <h2 style="margin:0 0 6px 0;font-size:18px;color:#1f2a24;font-weight:700;">4. Discuter ensemble, en direct</h2>
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#445a4f;">
                    La page Messages regroupe la discussion <em>Général</em>, les salons créés par les copropriétaires et les conversations liées aux réservations. Quand une objection est déposée, un sujet dédié apparaît dans <em>Réservations en discussion</em> pour échanger au bon endroit.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 32px 4px 32px;" align="center">
            <img src="${messages}" alt="Messagerie Clos Verde avec mention" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:1px solid #e1dbd0;border-radius:8px;" />
          </td>
        </tr>

        <tr>
          <td style="padding:18px 32px 4px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f4ee;border-radius:10px;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0 0 8px 0;font-size:14px;color:#1f2a24;font-weight:700;">Dans les messages</p>
                  <p style="margin:0 0 8px 0;font-size:13px;line-height:1.55;color:#5a6b62;">
                    Utilisez le bouton <strong>Nouveau</strong> pour créer un salon lorsque la discussion mérite son propre sujet.
                  </p>
                  <p style="margin:0 0 8px 0;font-size:13px;line-height:1.55;color:#5a6b62;">
                    Le champ de message permet d'écrire en direct et l'icône trombone sert à joindre un fichier.
                  </p>
                  <p style="margin:0;font-size:13px;line-height:1.55;color:#5a6b62;">
                    Le bouton <strong>Muter</strong> coupe les notifications d'une discussion sans la masquer.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- SECTION 5 — AVIS -->
        <tr>
          <td style="padding:28px 32px 8px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-left:4px solid #e8a23a;padding-left:14px;">
                  <h2 style="margin:0 0 6px 0;font-size:18px;color:#1f2a24;font-weight:700;">5. Envoyer un avis</h2>
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#445a4f;">
                    Le bouton <strong>Avis</strong>, en haut à droite de l'application, ouvre un formulaire de retour. Commencez par choisir l'objet de votre retour&nbsp;: <strong>Bug</strong>, <strong>Suggestion</strong>, <strong>Question</strong> ou <strong>Autre</strong>. L'étape suivante permet de décrire le sujet et d'ajouter une pièce jointe si besoin.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 32px 4px 32px;" align="center">
            <img src="${avis}" alt="Formulaire d'avis Clos Verde" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:1px solid #e1dbd0;border-radius:8px;" />
          </td>
        </tr>

        <!-- SECTION 6 — TICKETS -->
        <tr>
          <td style="padding:28px 32px 8px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-left:4px solid #e8a23a;padding-left:14px;">
                  <h2 style="margin:0 0 6px 0;font-size:18px;color:#1f2a24;font-weight:700;">6. Suivre ses tickets</h2>
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#445a4f;">
                    La rubrique <strong>Mes tickets</strong> liste vos retours envoyés à l'équipe. L'onglet <strong>En cours</strong> affiche les tickets ouverts, l'onglet <strong>Historique</strong> les tickets terminés, et le bouton <strong>Créer un ticket</strong> permet d'envoyer un nouveau retour depuis cette page.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 32px 4px 32px;" align="center">
            <img src="${tickets}" alt="Liste Mes tickets Clos Verde" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:1px solid #e1dbd0;border-radius:8px;" />
          </td>
        </tr>
        <tr>
          <td style="padding:14px 32px 4px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff8eb;border:1px solid #f1d9a7;border-radius:10px;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0 0 8px 0;font-size:14px;color:#1f2a24;font-weight:700;">Où retrouver vos retours&nbsp;?</p>
                  <p style="margin:0 0 8px 0;font-size:13px;line-height:1.55;color:#5a6b62;">
                    Les badges indiquent le type du ticket, par exemple <strong>Bug</strong>, <strong>Suggestion</strong>, <strong>Question</strong> ou <strong>Autre</strong>.
                  </p>
                  <p style="margin:0 0 8px 0;font-size:13px;line-height:1.55;color:#5a6b62;">
                    Quand une pièce jointe existe, l'icône trombone apparaît directement dans la ligne du ticket.
                  </p>
                  <p style="margin:0;font-size:13px;line-height:1.55;color:#5a6b62;">
                    Le détail d'un ticket reprend les réponses de l'équipe et vous permet de clôturer ce qui est résolu.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- SECTION 7 — FAQ -->
        <tr>
          <td style="padding:28px 32px 8px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-left:4px solid #3e76b9;padding-left:14px;">
                  <h2 style="margin:0 0 6px 0;font-size:18px;color:#1f2a24;font-weight:700;">7. Retrouver l'aide et les notifications</h2>
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#445a4f;">
                    La FAQ reprend les explications sur le calendrier, les réservations, les messages et les tickets. Elle indique aussi comment activer les notifications depuis le menu de votre compte, pour être prévenu des mentions, des objections et des réponses à vos tickets.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 32px 4px 32px;" align="center">
            <img src="${faq}" alt="FAQ Clos Verde" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:1px solid #e1dbd0;border-radius:8px;" />
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:32px 32px 8px 32px;" align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:#2e5e4e;border-radius:8px;">
                  <a href="https://clos-verde.elyspio.fr/" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
                    Accéder à Clos Verde
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:14px 0 0 0;font-size:13px;color:#6a7a72;line-height:1.5;">
              Si vous n'avez pas encore de compte, vous pouvez le créer directement sur le site avec votre adresse mail. La FAQ reste disponible dans l'application pour retrouver ces explications.
            </p>
          </td>
        </tr>

        <!-- OUTRO -->
        <tr>
          <td style="padding:24px 32px 8px 32px;">
            <p style="margin:0 0 10px 0;font-size:14px;line-height:1.6;color:#384a40;">
              N'hésitez pas à me dire ce que vous en pensez, à me remonter le moindre bug ou la moindre idée d'amélioration&nbsp;: c'est notre outil, autant qu'il nous ressemble.
            </p>
            <p style="margin:18px 0 0 0;font-size:14px;line-height:1.6;color:#384a40;">
              À très vite sur Clos Verde,<br />
              <strong>Jonathan</strong>
            </p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:20px 32px 28px 32px;border-top:1px solid #e1dbd0;">
            <p style="margin:0;font-size:12px;color:#8a978f;text-align:center;line-height:1.5;">
              © 2026 — Jonathan Guichard — Clos Verde
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;

fs.writeFileSync(OUT, html, "utf8");
const sizeKb = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log(`[email] wrote ${OUT} (${sizeKb} KB)`);
