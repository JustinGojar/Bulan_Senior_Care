# Manuscript Changes to Match the Developed System

Every change below follows the system as built, as of 2026-10-29: the Laravel backend, the
React frontend, and the uncommitted work that renames the leader role to "president" and
removes SMS. Where the manuscript and the system disagree, the manuscript changes.

Each item gives the section, what the manuscript says now, and replacement text you can paste.
Items marked **[CONFIRM]** depend on facts that the code cannot prove, such as test results or
where the system is hosted.

---

## A. Changes that apply to the whole manuscript

| # | Manuscript says | System does | Change to |
|---|---|---|---|
| A1 | "Leaders" / "Barangay Leaders" | The role is stored as **president** and shown as **BSCA President**. Its pages open under `/bsca/...` | Use **"BSCA President (Barangay Leader)"** the first time it appears in each chapter, then **"BSCA President"**. Change the DFD, use case and activity labels from "Leaders" to "BSCA President". |
| A2 | Email **and SMS** advisories; "Email/SMS Alert"; SMS through the "Resend API" | SMS was removed: the `sms` channel was dropped from the notifications table. **Resend is not used.** Email goes through the configured mail service, which is Gmail through a Google Apps Script relay (Mailjet, Brevo and SMTP are also supported) | Delete every mention of SMS and Resend: Fig. 4.1, the 4.1 paragraph, the DFD Level 1 text, "Email/SMS Alert" in the use case, "Send SMS/Email Notification" in the activity diagram, 4.5.3 GitHub ("SMS notification system") and Table 4.3 ("SMS Notifications"). |
| A3 | Emails go to "Barangay Leaders **and senior citizens**" | Seniors have no accounts and no stored email address, so **only BSCA Presidents receive email advisories** | Write "email advisories to the BSCA President of the senior's barangay". |
| A4 | "Export to PDF" | Reports and lists export to **PDF, Word and Excel**, and can be printed. The Admin can turn the export permission on or off for the Head and the Presidents | Write "printed and exported to PDF, Word, or Excel". |
| A5 | "Percentenarian" / "Precentenarian" (spelled both ways) | The program in the system is **"Precentenarian Program"** | Use "Precentenarian Program" everywhere (pages 4 and 5). |
| A6 | Admin "encodes" or "registers" seniors (activity diagram) | **Only the BSCA President registers seniors.** The system blocks the Admin and the Head from registering ("Seniors are registered by barangay leaders") | Remove registration and encoding from the Admin lane and the Admin use cases. |
| A7 | Head "approves or rejects edit requests" and Admin/Head "approve registrations" | Correct, but the Head's rights are **permissions the Admin can turn off** (Settings → User roles & access control). The Admin always has every permission | Add the permission sentence in 1.4 and 4.2 (see B2). |

---

## B. Chapter 1

### B1. 1.2 Purpose and Description, paragraph 2

Replace the paragraph from "The purpose of this system…" up to "…accurate over time." with:

> The purpose of this system is to automate essential functions of the Office for Senior Citizens Affairs (OSCA) operations. The Senior Citizen Registration module enables the BSCA Presidents of each barangay to encode the personal information, privacy consent, and supporting documents (valid ID, birth certificate, and photo) of senior citizens, one at a time or through a bulk upload of a CSV or Excel file, eliminating the reliance on manual recordkeeping. The system assigns each registered senior an OSCA ID number, accepts only applicants who are at least 60 years old, and blocks a record with the same name and birthdate as an existing or archived record. The Eligibility Verification feature lets the OSCA Admin and the OSCA Head approve a pending registration, mark it not eligible with a reason, or return it to the President when its documents need to be corrected. Through benefit tracking, the system lists the qualified seniors of each scheduled release batch, records whether each senior received the benefit, keeps the proof of release, and blocks paying the same benefit twice for the same period. It also handles benefit requests that the Presidents file for individual seniors, which the Head verifies and releases. The Reports and Analytics module enables OSCA personnel to create precise and timely reports from the stored records. The OSCA Admin generates a Municipal Summary, a Barangay Summary, or a Benefit Distribution report, and the OSCA Head reviews it, returns it for revision when needed, approves it, and publishes it. The figures of each report are saved at the time it is generated, so the report that the Head approves is the same report that is published, printed, and exported. The Notifications feature delivers in-app notifications to every user and, when the Admin turns them on, email advisories to the BSCA Presidents about registration decisions, document corrections, benefit release schedules, milestone grants, announcements, and published reports. The Age Threshold Detection feature checks every day which active seniors have turned 80, 85, 90, 95, or 100 and have not yet received the matching grant, which keeps beneficiary records complete and accurate over time.

### B2. 1.4 Scope and Limitation, paragraph 2 (roles)

Replace from "The system uses role-based access control…" up to "…by the OSCA Admin and the OSCA Head." with:

> The system uses role-based access control with three user roles to protect data. BSCA Presidents (Barangay Leaders) register the senior citizens of their own barangay and can view only those records. Any change they make to a registered record is submitted as an edit request that the OSCA Head must approve. They also correct and resubmit documents when a registration is returned to them, record the death of a senior together with the death certificate, request benefits for approved seniors, record whether each senior in a release batch received the benefit, and upload proof of release such as the signed payroll and photos. The OSCA Head verifies the eligibility of new registrations, approves or rejects edit requests, verifies, rejects, and releases benefit requests, schedules benefit release batches, posts announcements, monitors data and analytics, and reviews, approves, and publishes reports. The OSCA Admin also verifies eligibility, maintains all senior citizen records across barangays (update, archive, restore, and delete), updates benefit release statuses, completes release batches, manages user accounts and the permissions of each role, turns email advisories on or off, reviews the audit logs, backs up and restores the database, and generates reports for the Head's approval. The Admin can turn individual permissions on or off for the Head and the BSCA Presidents, such as approving registrations, scheduling releases, registering seniors, requesting benefits, and exporting reports. Senior citizens do not log in to the system; their records are encoded by the BSCA Presidents and maintained on their behalf by the OSCA Admin and the OSCA Head.

### B3. 1.4 Scope and Limitation, paragraph 3 (notifications and reports)

- Replace "Notifications are delivered inside the system and, when enabled by the OSCA Admin, as email to Barangay Leaders and senior citizens." with:
  > Notifications are delivered inside the system to every user and, when enabled by the OSCA Admin, as email to the BSCA Presidents. The system does not send SMS.
- Replace "Reports can be viewed on screen, printed, and exported to PDF." with:
  > Reports can be viewed on screen, printed, and exported to PDF, Word, or Excel, subject to the export permission that the Admin sets for each role.
- Add to the limitations list:
  > Senior citizens do not have accounts and receive no notifications directly; advisories reach them through their BSCA President.

### B4. 1.4 Scope and Limitation, last paragraphs (platform)

Add after "…cannot operate without an active internet connection.":

> The system is a responsive web application. On Android and iOS it can also be installed to the home screen from the browser. A signed-in session ends automatically after 30 minutes without activity.

### B5. 1.3 Objectives, item 2.7

"Age Thresholder Detection" → **"Age Threshold Detection"**

---

## C. Chapter 2

### C1. 2.3, paragraph on Vasquez et al. [18]

Replace "…through a Benefit Tracking feature that logs allowances, medical assistance, and other special privileges per senior citizen record…" with:

> …through a Benefit Tracking feature that records, for each senior citizen, the release status of the Social Pension, the Octogenarian, Nonagenarian, and Centenarian grants, the Precentenarian Program, and the Provincial Program, together with the release date, the period, and the proof of release…

The system tracks only these six programs. It has no medical-assistance or privilege records.

---

## D. Chapter 3

### D1. Table 3.2 System Software Specification

Replace the rows below:

| Particular | Recommended Requirements |
|---|---|
| Frontend Technologies | React 19, TypeScript, TanStack Router, TanStack Query, Tailwind CSS 4 |
| Charts, Import and Export | Recharts (charts), jsPDF (PDF), SheetJS/xlsx (Excel import and export) |
| Backend Technologies | PHP 8.2, Laravel 12, Laravel Sanctum, Spatie Laravel Permission |
| Email Service | Gmail through a Google Apps Script relay (Laravel Mail) |
| Build Tool | Vite running on Node.js |

Also fix the typo "PHP Larav PHP 8.2".

### D2. 3.1.2, paragraph after Table 3.2

Replace "Recharts was used to draw the charts of the descriptive analytics and reports, and jsPDF was used to export reports to PDF." with:

> Recharts was used to draw the charts of the descriptive analytics and reports, jsPDF was used to export reports to PDF, and SheetJS was used to read bulk-upload spreadsheets and export lists to Excel. Spatie Laravel Permission stores the permissions that the Admin turns on or off for each role, and Laravel Mail sends the email advisories through Gmail.

### D3. 3.3 Technical Terms

Delete the instruction line "List down all the technical terms used in objectives and add the proposed system title." Then add these terms:

> **BSCA President.** The president of the Barangay Senior Citizens Association. In this study, it refers to the barangay-level user of the system who registers the senior citizens of the barangay and records their benefit releases.
>
> **Eligibility Review.** The page where the OSCA Admin and the OSCA Head approve a pending registration, mark it not eligible, or return it for document correction.
>
> **Release Batch.** A scheduled distribution of one benefit program for a period (for example, a quarter) to one or more barangays. The system lists the qualified seniors of the batch automatically.
>
> **Benefit Request.** A request filed by a BSCA President for a benefit for one approved senior. The OSCA Head verifies it, then records its release.
>
> **Age Threshold Detection.** The daily check that identifies active seniors who have reached 80, 85, 90, 95, or 100 and have not yet received the matching grant.
>
> **Audit Log.** The record of who changed what in the system, kept for accountability.
>
> **Archive.** Records removed from the active list. They are kept so that the Admin can restore them later.

Also fix "methos" → "method" and "graph" → "graphs" in Descriptive Analytics.

---

## E. Chapter 4: Concept and System Architecture

### E1. 4.1 Concept

Replace "The system offers role-based access for administrators and staff to ensure data security and proper management." with:

> The system offers role-based access for three roles, the OSCA Admin, the OSCA Head, and the BSCA Presidents, to ensure data security and proper management.

### E2. Fig. 4.1 System Architecture Diagram (redraw)

- Users: **OSCA Head, BSCA Presidents (Barangay Leaders), OSCA Admin** (not "Head → Leaders → Admin" in a chain).
- Notifications: two outputs only, **In-app notifications (stored in the database)** and **Email advisories (Gmail via Google Apps Script)**. Remove **Resend API** and **SMS**. The draft in `docs/manuscript-diagrams/Fig-4.1-System-Architecture.drawio` still has an "SMS advisories / Semaphore SMS API" box. Delete it.
- Modules: Senior Citizen Registration, Eligibility Verification, Benefit Tracking, Reports, Descriptive Analytics, Age Threshold Detection, Notifications, User Roles and Access Control.
- **[CONFIRM]** If the system is deployed online as described in `docs/DEPLOYMENT.md`, label the hosting as a React frontend on Vercel and a Laravel API with MySQL on Railway.

### E3. Paragraph below Fig. 4.1

Replace the whole paragraph. The current one repeats the "Meanwhile, the business logic layer…" sentence twice and mentions SMS/Resend:

> The Office of Senior Citizen Affairs Assistant Management System described in Figure 4.1 is a web-based application that provides different access to three user roles: the OSCA Head, the BSCA Presidents, and the OSCA Admin. These users reach the system through a web browser over the Internet. The system uses a layered architecture made up of the presentation layer, the business logic layer, the modules, and the data layer. The presentation layer is built with React and TypeScript on top of HTML, CSS, and JavaScript and handles the user interface. The business logic layer uses Laravel (PHP), which exposes a REST API secured with Laravel Sanctum, processes workflows, and enforces the rules and permissions of each role. It also runs the notification service: in-app notifications are stored in the database, and email advisories are sent to the BSCA Presidents through the configured mail service when the Admin turns them on. Scheduled tasks check the age thresholds of active seniors every day and copy new posts from the OSCA Facebook page into the announcements every 15 minutes.

### E4. Paragraph after that (modules)

Replace "specifically senior citizen registration, eligibility verification, benefit tracking and reports, and analytics" with:

> specifically senior citizen registration, eligibility verification, benefit tracking, reports, descriptive analytics, and age threshold detection

### E5. 4.2 Analysis and Design

"The system will be modeled using UML diagrams" → "The system **was** modeled using UML diagrams". It is built now.

---

## F. Fig. 4.2.1 Context Diagram (DFD Level 0), redraw and replace the text

**Entities and flows:**

| Entity | To the system | From the system |
|---|---|---|
| BSCA President | Senior information, privacy consent and documents; corrected documents; edit requests; benefit requests; release status and proof; death records | Registration status and decisions; document-correction notices; release schedules and rosters; benefit request decisions; milestone-grant alerts; published reports; email advisories |
| OSCA Admin | Eligibility decisions; record updates (edit, archive, restore, delete); release status and batch completion; report generation and revision; user accounts and role permissions; notification settings; backup and restore | Pending registrations; senior and benefit records; analytics; returned reports with remarks; milestone-grant alerts; audit logs |
| OSCA Head | Eligibility decisions; edit request decisions; benefit request verification and release; release batch schedules; report approval, return, and publication; announcements | Pending registrations and edit requests; benefit requests; analytics and summaries; reports for review; milestone-grant alerts |

**Replacement text for both paragraphs below Fig. 4.2.1:**

> In Figure 4.2.1, the context-level (Level 0) Data Flow Diagram shows the Office of Senior Citizen Affairs Assistant Management System as one process that exchanges data with three external entities. The BSCA President submits the information, privacy consent, and supporting documents of each senior in the barangay, together with edit requests, benefit requests, and the release status of each senior in a release batch. In return, the President receives the registration decisions, document-correction notices, release schedules, benefit request decisions, milestone-grant alerts, and published reports. The OSCA Admin sends eligibility decisions, record updates, release statuses, report requests, user accounts, and system settings, and receives the pending registrations, the senior and benefit records, analytics, and returned reports. The OSCA Head sends eligibility and edit request decisions, benefit request verifications and releases, release schedules, report decisions, and announcements, and receives the pending items, analytics, and reports for review.
>
> Overall, the diagram shows the system as a central hub that connects the BSCA Presidents, the Admin, and the Head. Registration and benefit recording start at the barangay level, verification and maintenance are carried out by the Admin, and supervision, scheduling, and publication are performed by the Head.

Also delete the informal wording ("kind of feels like", "sort of like feedback loops") throughout Chapter 4.

---

## G. Fig. 4.2.2 Data Flow Diagram Level 1, redraw and replace the text

**Processes (seven, not six; the text currently says "six" but the figure has 7.0):**

1. **1.0 Registration**: from the President; checks age (60+), checks DB1 for duplicates (including archived records), requires privacy consent, stores the documents, and saves the record as *Pending* with a generated OSCA ID. Bulk upload takes up to 500 rows per file.
2. **2.0 Eligibility Verification**: Admin or Head; *Approve* → Active; *Not eligible* (reason required) → Inactive; *Return for document correction* (a note) → the President resubmits the documents and the record goes back for review. The President is notified of each decision.
3. **3.0 Benefit Tracking**: three paths:
   - *Release batches*: the Head schedules a batch for selected barangays; the system lists the qualified active seniors in DB2 as pending. The President or Admin marks each one *Released* or *Not received* and uploads proof. The Admin or Head completes the batch after the release date, and anyone not yet released is recorded as *Not received*.
   - *Benefit requests*: the President requests a benefit for one approved senior → the Head verifies or rejects it (reason required) → the Head records the release, which files the transaction in DB2.
   - *Duplicate guard*: one release per senior, benefit, and period; one-time grants only once.
4. **4.0 Notifications**: in-app notifications to all roles, plus email advisories to the BSCA Presidents when the Admin turns them on. **No SMS and no email to seniors.**
5. **5.0 User Management**: the Admin creates Head and President accounts (a new account must verify its email), changes roles and status, sets role permissions, and every change goes to the audit log (DB3).
6. **6.0 Reports and Analytics**: unchanged from the current text (draft → returned/approved → published, with a stored snapshot), except that published reports export to PDF, Word, or Excel.
7. **7.0 Age Threshold Detection**: runs daily at 12:05 AM and whenever a record becomes active; notifies the Admin, the Head, and the senior's President (the President also by email).

**Data stores:** DB1 Senior Citizen Records, DB2 Benefit and Distribution Records (benefits, release batches, transactions, release documents, benefit requests), DB3 User Data and Audit Logs, DB4 Analytics and Reports Data, DB5 Notifications. The draft `DFD-Level-1.drawio` already has DB5.

**Replacement text for paragraph 1 (after the figure):**

> In Figure 4.2.2, the Level 1 Data Flow Diagram (DFD) breaks the Office of Senior Citizen Affairs Assistant Management System into seven processes: registration, eligibility verification, benefit tracking, notifications, user management, reports and analytics, and age threshold detection. The flow begins when a BSCA President submits the information, privacy consent, and supporting documents of a senior citizen in the barangay to Process 1.0 Registration, one at a time or through a bulk upload. The process confirms that the applicant is at least 60 years old and checks DB1 Senior Citizen Records for a record with the same name and birthdate, including archived records, before saving the new record with a pending status and a generated OSCA ID number. The pending records are then used in Process 2.0 Eligibility Verification, where the Admin or the Head reviews the record and its documents. An approved record becomes active, a record that does not qualify is marked inactive as not eligible with the reason, and a record whose documents have a problem is returned to the President, who uploads corrected documents for another review. The President is notified of every decision. Active records move on to Process 3.0 Benefit Tracking. The Head schedules a release batch for a program, a period, a date, and selected barangays, and the system lists the qualified active seniors as pending. Age-based grants are given by the senior's exact age on the release date. The President or the Admin records whether each senior received the benefit and uploads the proof of release, such as the signed payroll and photos. After the release date, the Admin or the Head completes the batch, and seniors who did not claim the benefit are recorded as not received. A President may also request a benefit for one approved senior; the Head verifies or rejects the request and then records its release. The system blocks releasing the same benefit to the same senior twice for a period, and a one-time grant more than once. These details are stored in DB2 Benefit and Distribution Records.

**Paragraph 2:** keep it, with these changes:
- "sends in-app notifications, together with email and SMS advisories through the Email/SMS Alert entity, to keep Leaders and senior citizens informed" → "sends in-app notifications to all users and, when enabled by the Admin, email advisories to the BSCA Presidents, to keep them informed"
- "Process 5.0 User Management handles the creation and updating of Head and Leader accounts" → "…of Head and BSCA President accounts, the verification of their email addresses, and the permissions of each role"
- Add at the end: "Process 7.0 Age Threshold Detection checks every day which active seniors have turned 80, 85, 90, 95, or 100 and have not yet received the matching grant, and notifies the Admin, the Head, and the President of the senior's barangay."

---

## H. Fig. 4.2.3 Use Case Diagram, redraw and replace the text

The current figure still shows "View own profile / Add / Update / Delete", "Calculate benefit amount", and "Notify admin on data anomaly". **None of these exist in the system.** Remove them. The draft `Fig-4.2.3-Use-Case-Diagram.drawio` is close; change "Email / SMS Alert" there to "Email Alert".

**Use cases per actor:**

| BSCA President | OSCA Admin | OSCA Head |
|---|---|---|
| Register Senior Citizen «include» Age Validation, Check Duplicate Record, Data Privacy Consent; «extend» Bulk Upload (CSV/Excel) | Verify Eligibility (shared) «extend» Return for Document Correction | Verify Eligibility (shared) |
| View Barangay Records «extend» Request Profile Update | Manage Senior Records (update, mark inactive, archive, restore, delete) | Review Edit Requests |
| Resubmit Documents | Manage User Accounts «include» Log Audit Trail | Verify and Release Benefit Requests |
| Record Deceased Senior | Manage Role Permissions | Schedule Benefit Releases |
| Request Benefits | Record Release Status; Complete Release Batch | View Analytics |
| Record Release Status «include» Upload Release Proof; «extend» Print Payroll | Generate Reports «extend» Revise Returned Report, Export | Review and Approve Reports «extend» Return for Revision |
| View Analytics (own barangay) | View Analytics «include» Age Threshold Detection | Publish Report |
| View Published Reports «extend» Print/Export | Configure Notification Settings | Monitoring Data «extend» Flag Inactive Senior Citizen |
| Notifications «include» Email Alert | Backup and Restore Data | Post Announcements |
| Messages, Announcement Comments | View Audit Logs | Messages |

**Replacement text, Leaders paragraph** (rename to "BSCA President"):

> **BSCA President.** The BSCA Presidents are the main encoders of senior citizen records. The first use case is Register Senior Citizen, which lets a President enroll the senior citizens of their own barangay by submitting their personal details, the senior's data privacy consent, and supporting documents, one at a time or through a bulk upload of a CSV or Excel file. It includes Age Validation, which accepts only applicants who are at least 60 years old, and Check Duplicate Record, which blocks a record with the same name and birthdate as an existing or archived one. The second is View Barangay Records, which lets the President view and search only the records of their own barangay. It extends to Request Profile Update, because a President cannot change a registered record directly; the change is submitted to the Head for approval. When a registration is returned because of a problem with its documents, the President uses Resubmit Documents to upload corrected files, and the President uses Record Deceased Senior to record a death with its date and the death certificate. The third is Benefit, which lets the President request a benefit for an approved senior, view the release batches of the barangay, print the payroll, record whether each senior received the benefit, and upload the proof of release. The fourth is Notifications, which keeps the President informed about registration decisions, document corrections, benefit release schedules, benefit request decisions, milestone grants, announcements, and reports, and it includes Email Alert. The fifth is View Published Reports, which lets the President view, print, and export the reports that the Head has published for their barangay, as well as the Municipal Summary. The President can also view the analytics of their own barangay, exchange messages with the Head, and comment on announcements.

**Admin paragraph** changes:
- "The second is Manage Senior Records, which lets the admin update, archive, restore, and delete…" → add "mark inactive (deceased, transferred, withdrawn, duplicate, or other) with the reason".
- After Verify Eligibility, add: "It extends to Return for Document Correction, which sends a pending registration back to the President with a note on what is wrong with the documents."
- Manage User Roles → "Manage User Accounts, which lets the admin create, update, activate, deactivate, and delete Head and BSCA President accounts, and Manage Role Permissions, which turns individual permissions on or off for the Head and the Presidents."
- Benefit → "…recording the release status of each senior citizen in a release batch, uploading proof of release, and completing a batch after its release date…"
- Generate Reports: "the Export to PDF extension" → "the Export extension (PDF, Word, or Excel)", and add the missing period at the end of the sentence.
- Add: "The admin also configures whether email advisories are sent, reviews the audit logs, and creates and restores backups of the database."

**Head paragraph** changes:
- After Review Edit Requests, add: "The third is Verify and Release Benefit Requests, which lets the Head verify a benefit request filed by a President or reject it with a reason, and then record its release." Renumber the rest.
- Add: "The Head also posts announcements, which are shown on every user's dashboard."
- Add: "Each of these Head actions is a permission that the Admin may turn off."

---

## I. Fig. 4.2.4 Activity Diagram, redraw and replace the text

The current figure has the **Admin** searching, encoding, and uploading senior records, and "Send SMS/Email". Both are wrong. Use the draft `Fig-4.2.4-Activity-Diagram.drawio`; its lanes match the system.

**Replacement text:**

> **Login.** The process starts when a user logs in with an email address and password. The system checks the credentials. After five failed attempts, sign-in is locked for five minutes. An account whose email address is not yet verified is sent a new verification link, and an inactive account is refused. Once the credentials are confirmed, the system identifies the role and loads the BSCA President, Admin, or Head dashboard.
>
> **BSCA President Workflow.** After opening the dashboard, the President searches the records of the barangay to see whether the senior citizen is already registered. The system checks for a record with the same name and birthdate, including archived records. When a duplicate is found, the record is not saved, and the President can request an update of the existing record instead. When no duplicate exists, the President encodes the new record with the senior's privacy consent and uploads the valid ID and birth certificate. The system accepts the record only if the applicant is at least 60 years old, saves it as pending, and sends the President an advisory that the registration is awaiting validation. If the registration is returned for document correction, the President corrects and resubmits the documents. The President can also request a benefit for an active senior, view the release schedule, print the payroll, record the release status of each senior, and upload the signed payroll and photos. If a registered record needs to be corrected, the President submits a profile update request, which the system stores until the Head approves or rejects it.
>
> **Admin Workflow.** The Admin reviews the pending registrations and their supporting documents on Eligibility Review. If the documents have a problem, the Admin returns the registration to the President with a note. If the applicant does not meet the requirements, the Admin marks the registration not eligible with a reason, and the record becomes inactive. If everything is satisfied, the Admin approves the registration and the record becomes active. The President is notified of each decision. The Admin also maintains the senior citizen records, records release statuses, completes release batches after their release date (seniors who did not claim are recorded as not received), manages user accounts and role permissions, and backs up the data. The Admin then generates a report by selecting its type and, when required, the barangay it covers. The system stores its figures and notifies the Head that a report is waiting for review. When the Head returns a report, the Admin reads the remarks, corrects the records if needed, and revises the report, which regenerates it from the latest records and sends it back to the Head.
>
> **System.** The system checks credentials and routes each user to the dashboard of their role. It validates the age of each applicant, detects duplicate records, stores pending registrations, sends advisories to the President, and keeps profile update requests until the Head decides on them. It lists the qualified seniors of each release batch, blocks paying a benefit twice for the same period, records eligibility decisions, and keeps an audit trail. Every day it checks which active senior citizens have reached a milestone age for the Octogenarian, Nonagenarian, or Centenarian grant, and notifies the Admin, the Head, and the President of the senior's barangay. It stores the figures of each report when it is generated, records every review decision, and keeps the published copy unchanged. It notifies the Head when a report is submitted or resubmitted, the Admin when a report is returned, and the Admin and the Presidents concerned when a report is published.
>
> **Head Workflow.** After logging in, the Head reviews the profile update requests submitted by the Presidents and approves or rejects each one; an approved change is applied to the record. The Head also verifies or rejects benefit requests and records their release, schedules benefit release batches for selected barangays, and may approve or return pending registrations. The Head then opens a report submitted by the Admin and reviews its charts and tables. If the report is not approved, the Head returns it with remarks. If it is approved, the Head publishes it, after which its figures can no longer be changed, and the system notifies the Admin and the Presidents concerned. Afterward, the Head can log out.

---

## J. Fig. 4.2.5 Entity Relationship Diagram, redraw and replace the text

The current ERD has **separate ADMIN and HEAD tables** and **Membership Application / Registration Form** entities. The system has none of these in use:
- Admin, Head, and President are all rows in **users**, with a `role` column.
- The membership and registration-form particulars (association name, address, membership date, and position; civil status; education; family composition; living arrangement) are **columns of senior_citizens**. The old `membership_applications` and `registration_forms` tables are unused.

**Entities in the system** (use the draft `Fig-4.2.5-Entity-Relationship-Diagram.drawio`, which already follows this list):

| Entity | Key fields |
|---|---|
| users | id, name, email, password (hashed), role (admin / head / president), barangay_id, contact_number, address, status (active / inactive), email_verified_at, last_login |
| barangays | id, barangay_name, municipality, province |
| senior_citizens | id, osca_id_number, barangay_id, benefit_id, encoded_by, names, birthdate, sex, civil_status, contact_number, address, association fields, registration_date, status (pending / active / inactive), photo / valid ID / birth certificate paths, privacy_consent_version and privacy_consent_at, review_note and review_flagged_by, inactive_reason, date_of_death, death_certificate_path, inactivated_by, deleted_at (archived) |
| benefits | id, benefit_name, benefit_type, min_age, max_age, amount, funding_source, schedule (quarterly / one_time / conditional), status |
| benefit_releases | id, benefit_id, period_label, release_date, amount, status (scheduled / released / cancelled), completed_by, created_by |
| barangay_benefit_release | barangay_id, benefit_release_id (the barangays in a batch) |
| benefit_transactions | id, senior_citizen_id, benefit_id, benefit_release_id, amount, period_label, status (pending / released / failed = not received), date_distributed, reference_number, attachment_path, distributed_by |
| release_documents | id, benefit_release_id, path, original_name, uploaded_by |
| benefit_requests | id, senior_citizen_id, benefit_id, requested_by, status (for_verification / approved / rejected / released), rejection_reason, verified_by, released_by, release_date, benefit_transaction_id |
| senior_edit_requests | id, senior_citizen_id, requested_by, changes, status (pending / approved / declined), remarks, reviewed_by |
| analytics_reports | id, report_type, barangay_id, generated_by, generated_date, total_registered, remarks, status (draft / returned / approved / published), review_remarks, approved_by, published_by, published_at, snapshot |
| notifications | id, sender_account_id, recipient_account_id, message, channel (in_app / email), source_type, source_id, status (read / unread), archived_at |
| announcements, announcement_comments | announcements and the Presidents' comments and replies |
| messages | id, sender_id, recipient_id, message, attachment_path, read_at |
| audit_logs | id, actor_id, action, target_type, target_id, before_value, after_value |
| app_settings | key, value (e.g. whether email advisories are on) |
| roles, permissions (Spatie) | the permissions the Admin turns on or off for each role |

**Replacement text:**

> The Entity-Relationship Diagram (ERD) in Figure 4.2.5 shows an interconnected database anchored on the Users entity, which serves as the authentication backbone of the system. Each user account holds one of three roles, Admin, Head, or BSCA President, and a President account is assigned to one barangay. The permissions of each role are kept in the Roles and Permissions entities. Senior citizens do not have user accounts; each Senior Citizen record belongs to a Barangay, records the account that encoded it, and holds the senior's registration particulars, association membership, privacy consent, document files, review note, and, when inactive, the reason and the date of death. A Senior Edit Request stores the changes that a President proposes on a record until the Head approves or declines them. Benefits are tracked using Benefit, Benefit Release, and Benefit Transaction: a Benefit Release is a scheduled distribution batch for a program and period that covers one or more barangays, and each Benefit Transaction records the release status of a benefit for one senior citizen, with Release Documents holding the proof of release. A Benefit Request records a benefit that a President requested for one senior, its verification by the Head, and the transaction created when it was released. Each Analytics Report records its report type, the barangay it covers, the account that generated it, the generated date, the total number of registered senior citizens, and the remarks, together with its review status (draft, returned, approved, or published), the Head's revision remarks, the accounts that approved and published it, the date it was published, and a snapshot of its figures. The Notification entity handles alerts sent from one user account to another, Announcements and Messages support communication between the Head and the Presidents, and the Audit Log entity records the actions performed on the system's records.

---

## K. 4.2.2 Table 4.1 Functional Requirements (replace the table)

| Task Requirements | Task Reference |
|---|---|
| The system shall allow BSCA Presidents to register and encode the personal profile information, privacy consent, and supporting documents of senior citizens aged 60 and above in their barangay, one at a time or by bulk upload. | Senior Citizen Registration |
| The system shall allow authorized OSCA Admin, OSCA Head, and BSCA President accounts to log in using a verified email address and password, lock sign-in after repeated failed attempts, and let users reset a forgotten password with an emailed code. | User Authentication |
| The system shall detect a senior citizen record with the same name and birthdate as an existing or archived record and block the duplicate. | Duplicate Record Checking |
| The system shall allow the OSCA Admin and OSCA Head to approve a pending registration, mark it not eligible with a reason, or return it for document correction. | Eligibility Verification |
| The system shall allow BSCA Presidents to resubmit corrected documents for a returned registration. | Document Resubmission |
| The system shall allow the OSCA Admin to view, update, mark inactive, archive, restore, and delete the profiles of registered senior citizens. | Profile Management |
| The system shall allow BSCA Presidents to request an update of a registered record, which the OSCA Head approves or rejects. | Profile Update Request |
| The system shall allow the OSCA Head to schedule benefit release batches, list the qualified seniors of each batch, and allow BSCA Presidents and the OSCA Admin to record the release status and proof of release of each senior citizen. | Benefit Recording |
| The system shall allow BSCA Presidents to request a benefit for an approved senior, and the OSCA Head to verify, reject, and release the request. | Benefit Request |
| The system shall prevent releasing the same benefit to a senior twice in one period, and a one-time grant more than once. | Duplicate Release Checking |
| The system shall provide a monitoring feature to track the status and history of benefits distributed to senior citizens. | Benefit Monitoring |
| The system shall allow users to search and filter senior citizen records by name, OSCA ID, barangay, status, sex, age, and benefit. | Search and Filter |
| The system shall detect senior citizens who reach a milestone age for a grant and notify the users concerned. | Age Threshold Detection |
| The system shall provide descriptive analytics such as charts and summary statistics on senior citizen demographics and benefit distributions. | Descriptive Analytics |
| The system shall allow the OSCA Admin to generate Municipal Summary, Barangay Summary, and Benefit Distribution reports from the stored records. | Generate Reports |
| The system shall allow the OSCA Head to approve a generated report or return it to the Admin with remarks for revision. | Report Review and Approval |
| The system shall allow the OSCA Head to publish approved reports, keep the published copy unchanged, notify the Admin and the Presidents concerned, and allow reports to be printed and exported to PDF, Word, or Excel. | Report Publication |
| The system shall send in-app notifications, and email advisories to BSCA Presidents when enabled, regarding registrations, document corrections, benefit release schedules, benefit requests, age thresholds, announcements, and reports. | Notification System |
| The system shall allow the OSCA Head to post announcements and BSCA Presidents to comment on them, and allow the Head and Presidents to exchange messages. | Announcements and Messages |
| The system shall allow the OSCA Admin to create and manage Head and BSCA President accounts, set the permissions of each role, and keep an audit trail of changes. | User Roles and Access Control |
| The system shall allow the OSCA Admin to download a backup of the database and restore it from a backup file. | Backup and Restore |

---

## L. 4.2.3 Table 4.2 Non-Functional Requirements

- **Security** row, replace with:
  > The system shall require verified login credentials before accessing senior citizen records, lock sign-in after five failed attempts for five minutes, end inactive sessions after 30 minutes, store passwords as hashes, keep senior documents in private storage served only to authorized roles, enforce role-based access control on every request, and record changes in an audit log.
- **Reliability** row: "through automatic backup" → "through **downloadable database backups that the Admin can restore**". The system has manual backup and restore, not an automatic scheduled backup. **[CONFIRM]** whether the hosting provider takes automatic backups; if it does, keep "automatic" and name the provider.

---

## M. 4.3 to 4.6 (Development)

- **4.3 Iteration paragraph:** add document review (return for correction), benefit requests, role permissions, and the data privacy consent to the list of features defined through iteration.
- **4.3 Rapid Construction:** add "benefit requests, release batches with proof of release, announcements and messages, role permissions, and database backup and restore" to the list of components.
- **4.5.1 React and TypeScript paragraph:** add "TanStack Query loads and caches the data from the API, and SheetJS reads bulk-upload spreadsheets and exports lists to Excel."
- **4.5.2 Laravel paragraph:** replace the highlighted sentence with:
  > Laravel Sanctum secures the API, and Spatie Laravel Permission stores the permissions that the Admin turns on or off for the Head and the BSCA Presidents. Laravel's scheduler checks every day at 12:05 AM for senior citizens who have reached a milestone age and copies new posts from the OSCA Facebook page into the announcements every 15 minutes. Laravel Mail sends email advisories to the BSCA Presidents through Gmail when the Admin turns them on.
- **4.5.3 GitHub paragraph:** "new features which included the SMS notification system and the downloadable and printable reports feature" → "new features such as the report review and publication workflow, benefit release batches, and the downloadable and printable reports".
- **4.6 Development phase:** the six main pieces → add "benefit requests and release batches" and "announcements and messages". Remove any SMS mention.
- **4.6 Deployment phase:** **[CONFIRM]** If the system is hosted online (`docs/DEPLOYMENT.md` describes Vercel and Railway), replace "installed and launched at the LGU-Bulan OSCA office" with "deployed online and accessed by the OSCA office and the BSCA Presidents through a web browser".

---

## N. 4.8 Budget (Table 4.3)

- Remove the **SMS Notifications** row. SMS is no longer part of the system.
- **[CONFIRM]** Under "System expenses: subscription", list the real hosting cost (e.g. Railway, Vercel, domain) if any, or remove the row. The total of the printed items (Php 200 + 12 + 880) is **Php 1,092.00**, which matches the stated total.

---

## O. 4.9 Verification and Validation

- "The proponents used **three** ISO/IEC 25010 quality characteristics—functional suitability, reliability, performance efficiency, and security" → **four**.
- Fix "Table 1:reftab:likert" (a broken LaTeX reference) → "Table 4.4".
- **Table 4.5 contains text from a different project.** Replace the rows:

| Sub-characteristics | Description |
|---|---|
| Functional Completeness | The system provides all the functions needed to register seniors, verify eligibility, track benefits, generate reports, and send notifications. |
| Functional Correctness | The system computes ages, eligibility, release lists, and report figures correctly. |
| Functional Appropriateness | All buttons, links, and features operate as expected for each user role. |
| Accuracy | The OSCA Assistant Management System correctly identifies duplicate records and seniors who reach a milestone age. |
| Interoperability | The exported PDF, Word, and Excel files and the bulk-upload spreadsheets work with common office software. |

  Also change "correct and complete product information" in the paragraph below the table to "correct and complete senior citizen and benefit information".
- **Table 4.6:** "used by the admin and Head" → "used by the Admin, the Head, and the BSCA Presidents".

---

## P. 4.10 Testing

- The manuscript says "The proponents did not use test scripts." **The system has automated test scripts:** 43 PHPUnit feature-test files with about 189 test cases in `backend/tests/Feature`, covering registration, duplicates, document review, benefit releases and requests, reports, notifications, permissions, privacy, backup and restore, and security. Replace that sentence with:
  > In addition to manual testing, the proponents wrote automated feature tests with PHPUnit, Laravel's testing framework, which check each module's rules (such as age validation, duplicate checking, role permissions, release limits, and the report workflow) every time the code changes.
- "A total of 47 API endpoints were tested" → the API now has **84 endpoints**. **[CONFIRM]** Update the number to what was actually tested in Postman, and re-measure the pass rate and response time. Do not copy these numbers from this list; they must come from your test results.
- **[CONFIRM]** The 98 percent pass rate, 2-second, 320 ms, and 1.8-second figures must match your recorded results. Run `php artisan test` in `backend` to get the current automated pass count.
- The 4.10 list of modules: add Age Threshold Detection and Benefit Requests.

---

## Q. References

- [27] Laravel Documentation: change `https://laravel.com/docs/11.x` → `https://laravel.com/docs/12.x`. The system uses Laravel 12.
- Add the new technologies you cite:
  - Spatie: Laravel Permission. https://spatie.be/docs/laravel-permission
  - TanStack: TanStack Router and TanStack Query. https://tanstack.com
  - SheetJS: SheetJS Community Edition. https://docs.sheetjs.com
- [15] "Zenior Citizen" → "Senior Citizen" (typo in the title).
- Section 2.4 cites "[23]" for the De Jesus study; it should be **[21]**.

---

## R. Small wording fixes found along the way

- p.14: "845066 residents and 11 million senior citizens". 11 million is wrong for Bulan. **[CONFIRM]** Use the correct number of senior citizens or remove it.
- p.17: Table 3.1.1 lists a Core i3 with 8 GB, but the paragraph describes a Celeron N4100 with 4 GB and a 238 GB SSD. Make them match.
- p.19: Table 3.3 recommends a "128 GB SSD", but the text says "1TB SSD", and Android 11 is recommended in the text while the table says 7.0+. Make them match.
- p.21: delete the empty page after 4.1.
- p.29–30: remove the informal phrases ("kind of like, quickly", "you know, just repeats", "Worksflow").
