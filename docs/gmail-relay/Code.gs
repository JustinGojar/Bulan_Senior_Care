/**
 * Bulan SeniorCare Gmail relay.
 *
 * Paste this into a Google Apps Script project owned by the Gmail account that
 * should send the system's emails, set the SECRET script property, and deploy it
 * as a web app (Execute as: Me, Who has access: Anyone). See docs/DEPLOYMENT.md.
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('SECRET');

    if (!secret || data.secret !== secret) {
      return reply({ ok: false, error: 'Unauthorized' });
    }

    var options = {
      attachments: (data.attachments || []).map(function (file) {
        return Utilities.newBlob(Utilities.base64Decode(file.content), file.type, file.name);
      }),
    };
    if (data.html) options.htmlBody = data.html;
    if (data.fromName) options.name = data.fromName;
    if (data.replyTo) options.replyTo = data.replyTo;
    if (data.cc && data.cc.length) options.cc = data.cc.join(',');
    if (data.bcc && data.bcc.length) options.bcc = data.bcc.join(',');

    MailApp.sendEmail(data.to.join(','), data.subject || '', data.text || '', options);

    return reply({ ok: true, remaining: MailApp.getRemainingDailyQuota() });
  } catch (error) {
    return reply({ ok: false, error: String(error) });
  }
}

function reply(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
