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

const calendrier = dataUri("02-calendrier.png");
const reserver = dataUri("03-reserver.png");
const classement = dataUri("04-classement.png");
const messages = dataUri("05-messages.png");

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
              J'ai le plaisir de vous présenter <strong>Clos Verde</strong>, notre tout nouvel espace en ligne pour simplifier la vie du clos au quotidien&nbsp;: réserver la place commune sans s'écrire en boucle, voir d'un coup d'œil qui l'occupe ce week-end, et discuter ensemble au même endroit.
            </p>
            <p style="margin:0 0 0 0;font-size:15px;line-height:1.6;color:#384a40;">
              Voici en quelques captures les fonctionnalités que vous allez pouvoir utiliser dès maintenant.
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
                    Une vue mensuelle claire de toutes les réservations. Les vôtres apparaissent en bleu, celles des autres copropriétaires en vert. Vous naviguez entre les mois avec les flèches, et vous savez immédiatement si la place est libre ce samedi.
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
                  <h2 style="margin:0 0 6px 0;font-size:18px;color:#1f2a24;font-weight:700;">2. Réserver la place&nbsp;: un workflow transparent en trois temps</h2>
                  <p style="margin:0 0 10px 0;font-size:14px;line-height:1.6;color:#445a4f;">
                    Vous choisissez vos dates, vous pouvez préciser des horaires si vous n'avez besoin que d'une demi-journée, et vous ajoutez une petite note pour les voisins (par exemple&nbsp;: «&nbsp;repas de famille&nbsp;»). Une fois enregistrée, la réservation suit ce parcours&nbsp;:
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
                          Dès que vous validez le formulaire, votre réservation est enregistrée avec le statut <strong>En attente</strong>. Elle apparaît immédiatement sur le calendrier de tout le clos pour que chacun la voie.
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
                          Pendant un court délai après le dépôt (par défaut 1&nbsp;heure, ou jusqu'à la date de début si elle est plus proche), n'importe quel copropriétaire peut <strong>s'opposer</strong> à la réservation s'il a un conflit ou une remarque. L'objection ouvre une discussion dédiée pour en parler ensemble, calmement, et trouver un arrangement.
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
              L'idée de ce parcours n'est pas d'ajouter de la lourdeur, mais au contraire de remplacer les conversations à rallonge par un cadre simple et équitable, où chacun a son mot à dire dans une fenêtre courte et où, par défaut, ça se valide tout seul.
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
                    Le classement affiche les jours de réservation cumulés depuis le début, sans quota imposé. L'idée n'est pas de compter pour compter, mais de garder une vue d'ensemble pour que chacun puisse profiter de la place quand il en a envie.
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
                    Une messagerie pensée pour le clos&nbsp;: une discussion <em>Général</em> pour tout le monde, des sujets dédiés si on veut séparer les conversations, et la possibilité de mentionner un voisin avec <code style="background:#eef3ef;padding:1px 6px;border-radius:4px;font-size:13px;color:#2e5e4e;">@</code> pour qu'il soit notifié. Les messages arrivent en temps réel, sans rafraîchir la page. C'est aussi là qu'apparaîtront les discussions ouvertes en cas d'objection sur une réservation.
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

        <!-- CTA -->
        <tr>
          <td style="padding:32px 32px 8px 32px;" align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:#2e5e4e;border-radius:8px;">
                  <a href="https://VOTRE_URL_CLOS_VERDE" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
                    Accéder à Clos Verde
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:14px 0 0 0;font-size:13px;color:#6a7a72;line-height:1.5;">
              Votre compte est déjà prêt — vous vous connectez simplement avec votre adresse mail.
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
