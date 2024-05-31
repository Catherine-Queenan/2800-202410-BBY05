# PawFolio
Pawfolio, a user-friendly dog training web application and booking service, to help owners and reputable trainers connect without being bogged down from poor software and rampant industry misinformation by providing a single organized source and tool for their needs.

https://pawfolio.onrender.com/

## 1. Project Description
Pawfolio is a database and booking application created by pet owners and dog professionals, for pet owners and dog professionals. With a firsthand understanding of the current issues with existing booking software in the industry, Proper Subset has worked to create a well-rounded and user-friendly app. By providing curated and centralized resources to dog owners as well as a list of reliable dog trainers, Pawfolio is a one-stop resource for owners to get started on their dog ownership journey. Clients can browse trainers, and choose one that fits their needs and goals. An integrated chat and booking system allow trainers and clients to communicate seamlessly. Trainers don’t ever have to worry about recordkeeping again, with their business and program information stored in one place. Additionally, they can track and adjust each client’s outstanding balance and remaining credits to track payments and completed sessions. On Pawfolio, both dog trainers and dog owners can make canine-centered connections. 

## 2. Team Name: Proper Subset 2800-202410-BBY05
Roles:
- Catherine Queenan
    - Product Owner, Project Manager, UI/UX Designer
- Kevin Nguyen
    - Tech Lead, Full-stack Developer
- Eugenie Kim
    - Back-end Developer, Graphic Designer
- Filip Budd
    - Back-end Developer, Producer
- Evin Gonzales
    - Back-end Developer, Producer

## 3. Technologies and Resources Used
- Languages and Libraries
    - Javascript
    - EJS 3.1.10
    - CSS
    - JQuery 3.7.1
    - Axios 1.7.2
    - Node
    - FullCalendar 6.1.11
- Packages
    - Nodemailer
    - JOI 17.13.1
    - BCrypt 5.1.1
    - dotenv 16.4.5
    - Nodemon
    - Node-cron 3.0.3
- Database
    - Google Cloud
    - ioRedis 5.4.1
    - MongoDB
    - Express 4.19.2
    - Cloudinary 2.2.0
    - Multer 1.4.5-lts.1
- External Tools
    - Visual Studio Code
    - SourceTree
    - Studio3T
    - GitHub
    - Brackets
- Styling
    - GoogleAPI 137.1.0 fonts
    - SweetAlert2 11.11.0
    - Bootstrap 5.3.3
    - FlatIcon
    - Unsplash
    - Canva
    - Procreate
- Easter Egg Music
    - FL Studio
- AI
    - ChatGPT

## 4. Complete Setup/Installation
- 1. Clone the repository
    - `git clone https://github.com/Catherine-Queenan/2800-202410-BBY05.git`
- 2. Navigate to the project directory
    - `cd 2800-202410-BBY05`
- 3. Install dependencies
    - `npm i`
- 4. Create .env file including:
    - MONGODB_HOST
    - MONGODB_USER
    - MONGODB_PASSWORD
    - MONGODB_APPDATABASE
    - MONGODB_BUSINESSDATABASE
    - MONGODB_CLIENTDATABASE
    - MONGODB_SESSION_SECRET
    - NODE_SESSION_SECRET
    - CLOUDINARY_CLOUD_NAME
    - CLOUDINARY_CLOUD_KEY
    - CLOUDINARY_CLOUD_SECRET
    - EMAIL_ADDRESS
    - EMAIL_ADDRESS_PASSWORD
    - PROJECT_ID
    - BUCKET_NAME
    - GOOGLE_TYPE
    - GOOGLE_PROJECT_ID
    - GOOGLE_PRIVATE_KEY_ID
    - GOOGLE_PRIVATE_KEY
    - GOOGLE_CLIENT_EMAIL
    - GOOGLE_CLIENT_ID
    - GOOGLE_AUTH_URI
    - GOOGLE_TOKEN_URI
    - GOOGLE_AUTH_PROVIDER_X509_CERT_URL
    - GOOGLE_CLIENT_X509_CERT_URL
    - UNIVERSE_DOMAIN
    - SECRET_KEY
- 5. Start the server
    - `node index.js`

## 5. Usage Guide
- 1. General Features (all user types, include no account visitors)
    - Accessing curated and verified resources
    - Accessing FAQ page
    - Make an account (and recover it if you forget your password)
    - View the easter egg by clicking on the logo in the footer on the homepage
    - Direct messages are encrypted
- 2. Business User Features
    - Edit your profile business profile and specify types of services offered
    - Add and edit programs you provide
    - Book sessions with clients in a calendar
    - Edit sessions on a calendar
    - Chat with individual client
    - View alerts
    - Modify client outstanding balances and remaining credits
    - Search through your clients by name
    - Modify your trainer information
    - View clients and their dogs from the homepage
    - View weekly sessions on the homepage
    - View monthly calendar on homepage
    - Receive alerts from clients in-app
    - Accept or reject clients requesting to work with you or registering for a program
    - Accept or reject booking requests
    - Write notes on sessions that have been completed by clicking them on the calendar
    - Receive email updates for sessions 
    - Upload a pdf of your business contract, which will require it to be signed by new clients
- 3. Client User Features
    - Edit your profile
    - Delete your account
    - Add/Edit/Remove dogs
    - Upload vaccination records as PDFs for your dogs
    - Find trainers with a search feature and request to hire
    - Request to register a specific dog for a specific program with a trainer
    - Receive alerts for close-to expired or expired vaccinations 
    - View trainer and dogs on the homepage
    - Chat with your trainer
    - Receive email notifications about booked sessions
    - View sessions for the week
    - Request sessions from trainers
    - View your outstanding balance and remaining credits

## 6. Known Bugs and Limitations
- Business profiles cannot be deleted
- Alerts for hire requests and vaccinations are not sent to email/phone
- No notifications sent by text message
- Clients can delete their accounts while having an outstanding balance
- Clients cannot choose to stop working with a trainer
- PDFs stored in google drive but the subscription will soon be canceled

## 7. Features for the Future
- Transfer the outstanding balance and remaining credits system to a dedicated checkout page
- Implement a support chat
- Build a Report system to give trainers feedback on their business
- Add a section to review trainers
- Limit the number of clients that show on the business homepage to the most recent three
- Create a business settings page to allow customization (such as requiring session booking requests or not)
- Allow trainers to create alerts and notes that are business only view on specific dogs and clients
- Colour code sessions in the calendar according to program type
- Allow clients to request to switch trainers (upon trainer approval)


## 8. Database Cluster Structure:
```
├── appDB
│   ├── users
│       ├── _id: ObjectId()
│       ├── email:
│       ├── companyName:
│       ├── firstName:
│       ├── lastName:
│       ├── phone: 10 digits
│       ├── password: hashed
│       ├── userType: client or business
│       └── unreadAlerts: integer
├── client-email
│   ├── info
│       ├── _id: ObjectId()
│       ├── email:
│       ├── firstName:
│       ├── lastName:
│       ├── phone: 10 digits
│       └── address:
│   ├── messages
│       ├── _id: ObjectId()
│       ├── receiver: business companyName
│       ├── createdAt: Date()
│       ├── unread: boolean
│       ├── text: hashed
│       ├── iv: hashed
│       └── key: hashed
│   ├── notifications
│       ├── _id:ObjectId()
│       ├── dog: 
│       ├── vaccine: 
│       ├── type: 
│       ├── date: Date()
│       ├── notifType: 
│       └── dogId: ObjectId()
│   ├── outstandingBalance
│       ├── _id:
│       ├── dogName: 
│       ├── programName: 
│       ├── credits: integer
│       └── outstandingBalance: 0.00
│   ├── registrations
│       ├── _id: ObjectId()
│       ├── trainer: business companyName
│       ├── program:
│       ├── dog: objectId
│       └── price: 0.00
├── business-email
│   ├── alerts
│       ├── _id: ObjectId()
│       ├── alertType: 
│       ├── dog: ObjectId()
│       ├── dogName: 
│       ├── program: 
│       ├── programName: 
│       ├── clientEmail: 
│       └── clientName: 
│   ├── clients
│       ├── _id: ObjectId()
│       ├── email:
│       ├── firstName:
│       ├── lastName:
│       └── phone: 10 digits
│   ├── eventSource
│       ├── _id: ObjectId()
│       ├── title:
│       ├── start: Date() MUST BE IN THIS FORMAT YYYY-MM-DDTHH:MM:SS
│       ├── end: Date() MUST BE IN THIS FORMAT YYYY-MM-DDTHH:MM:SS
│       ├── client: email
│       ├── info:
│       └── notes:
│   ├── info
│       ├── _id: ObjectId()
│       ├── companyName:
│       ├── email:
│       ├── phone: 10 digits
│       ├── services: Array()
│       ├── companyWebsite:
│       ├── contract: pdf link
│       ├── description:
│       └── logo: img link
│   ├── messages
│       ├── _id: ObjectId()
│       ├── receiver: client email
│       ├── createdAt: Date()
│       ├── unread: boolean
│       ├── text: hashed
│       ├── iv: hashed
│       └── key: hashed
│   ├── programs
│       ├── _id: ObjectId()
│       ├── name: 
│       ├── pricing:
│           ├── priceType:
│           └── price: 0.00
│       ├── discount: 
│       ├── hours: decimal
│       ├── sessions: integer
│       ├── description:
│       └── service:
│   ├── sessionRequests
│       ├── _id: ObjectId()
│       ├── alertType: sessionRequest
│       ├── title: 
│       ├── start: Date() MUST BE IN THIS FORMAT YYYY-MM-DDTHH:MM:SS
│       ├── end: Date() MUST BE IN THIS FORMAT YYYY-MM-DDTHH:MM:SS
│       ├── trainer: business companyName
│       ├── client: client email
│       └── info:
│   ├── trainer
│       ├── _id: ObjectId()
│       ├── companyName: 
│       ├── firstName: 
│       ├── lastName: 
│       ├── certifications: 
│       ├── intro: 
│       └── trainerPic: img link
├── sessions
│   ├── sessions
│       ├── _id:
│       ├── expires: 1hr or 1 week
└──     └── session:
```

## 9. Contents of Folder
```
├── .gitignore                              # Specifies files to be ignored by Git
├── .databaseStructure.txt                  # The structure of our database cluster
├── index.js                                # Main server file
├── package.json                            # Manages project dependencies
├── README.md                               # This file
├── utils.js                                # Defines the include function
├── public/                                 # Contains public assets like images, stylesheets, and scripts
│   ├── audio/                              # Audio files
│       └── whoLetThemDawgsOutFinal.wav     # Music for the easter egg
│   ├── css/                                # Styling sheets
│       ├── calendar.css                    # Calendar specific styling
│       ├── chat.css                        # Chat messaging specific styling
│       └── style.css                       # global styling sheet
│   ├── icons/                              # icon files
│       ├── Bell.png                        # 
│       ├── Calendar.png                    # 
│       ├── Cart.png                        # 
│       ├── Client.png                      # 
│       ├── FAQ.png                         # 
│       ├── Logo.png                        # 
│       ├── Mail.png                        # 
│       ├── Profile.png                     # 
│       ├── Reports.png                     # 
│       ├── Resources.png                   # 
│       ├── Schedule.png                    # 
│       ├── Settings.png                    # 
│       └── Support.png                     # 
│   ├── images/                             # 
│       ├── AKCMain.png                     # 
│       ├── BeachPaws.png                   # 
│       ├── BlueCollar.png                  # 
│       ├── CanuckDog.png                   # 
│       ├── CAPDT.png                       # 
│       ├── CKCMain.png                     # 
│       ├── DefaultAvatar.png               # Used for any profile image if the user has not uploaded an image
│       ├── DogBackdrop.pns                 # 
│       ├── DogRunning.gif                  # 
│       ├── DogShow.png                     # 
│       ├── errorDog.png                    # 
│       ├── FamilyPaws.png                  # 
│       ├── Favicon.ico                     # Favicon
│       ├── H2.png                          # 
│       ├── Hero.png                        # 
│       ├── LeadingEdge.png                 # 
│       ├── PawBack.png                     # 
│       ├── PawPrints.avif                  # 
│       ├── PawPrints.png                   # 
│       ├── PawPrintsFade.png               # 
│       ├── PupReadFade.png                 # 
│       ├── SprucePets.png                  # 
│       └── UKCMain.png                     # 
│   ├── scripts/                            # Front-end scripting files
│       ├── addDog.js                       # Script for the dog adding form
│       ├── calendarBusiness.js             # Script for the main calendar for a business user
│       ├── calendarBusinessHome.js         # Script for the business homepage calendar card
│       ├── calendarBusinessSessions.js     # Script for the business sessions list
│       ├── calendarClient.js               # Script for the main calendar for a client user
│       ├── calendarClientHome.js           # Script for the client homepage calendar card
│       ├── calendarClientSessions.js       # Script for the client sessions list
│       ├── chatBusiness.js                 # Script for messaging on the business side
│       ├── chatClient.js                   # Script for messaging on the client side
│       ├── clientDogsHome.js               # Script for displaying client's dogs on the homepage
│       ├── clientListHome.js               # Script for loading clients onto a business user’s homepage
│       ├── clientSearch.js                 # Script for searching and loading clients onto the client search page
│       ├── clientTrainerHome.js            # Script for displaying client's trainer on the homepage
│       ├── easterEgg.js                    # Script for our easter egg
│       ├── editProfile.js                  # Script for editing the client profile
│       ├── global.js                       # Script for small events on every page
│       ├── messagePreview.js               # Script for the business homepage unread messages card
│       └── signUp.js                       # Script for validating matching passwords during signup
├── views/                                  # Contains EJS templates for rendering HTML
│   └── templates/                          # Nested templates
│       ├── accordion.ejs                   # Template for FAQ page
│       ├── alertHireRequest.ejs            # Template for the hire request card
│       ├── alertSessionRequest.ejs         # Template for the session request card
│       ├── alertVaccineUpdate.ejs          # Template for the vaccine expiration cards
│       ├── businessServiceBox.ejs          # Template for displaying individual service for a business in a list
│       ├── button.ejs                      # Template for an all use button that can be used in many situations
│       ├── checkmark.ejs                   # Template for checkmark inputs
│       ├── clientPreview.ejs               # Preview for clients of things to view on homepage
│       ├── clients.ejs                     # Template for chat client select
│       ├── clientViewProgram.ejs           # Template for viewing a trainer’s programs as a client
│       ├── dateInput.ejs                   # Template for date inputs on forms
│       ├── defaultingPic.ejs               # Template for images that use the DefaultAvatar if no image link is given
│       ├── dog.ejs                         # Template for dog previews on a client’s profile
│       ├── dogToTrainClient.ejs            # Template for dog previews when picking a dog to register
│       ├── dogViewingBusiness.ejs          # Template for previewing a dog from a business view
│       ├── footerCalendar.ejs              # Footer for pages with a loaded calendar
│       ├── footerCopyright.ejs             # Footer for all logged in pages
│       ├── footerLogin.ejs                 # Sticky footer template for users that have not logged in
│       ├── header.ejs                      # Header template for all pages
│       ├── hero.ejs                        # Bootstrap brain component
│       ├── homepage.ejs                    # Preview for clients of things to view on homepage
│       ├── icon.ejs                        # Template for icons to allow for easy addition of icons throughout the site
│       ├── linkButton.ejs                  # Template for bootstrap buttons that are links formatted as buttons
│       ├── loginForms.ejs                  # Template file that supports both logins and signups
│       ├── modalButton.ejs                 # Template for buttons on modals only
│       ├── navbarBusiness.ejs              # Navbar template for Business users while not on the homepage
│       ├── navbarBusinessHome.ejs          # Navbar template for Business users while on the homepage
│       ├── navbarClient.ejs                # Navbar template for Client users
│       ├── navbarEmpty.ejs                 # Navbar for a user that is not logged in
│       ├── outstandingRecord.ejs           # Template for a row in the outstanding balance table
│       ├── programProfileView.ejs          # Template for viewing programs on the business profile
│       ├── resource.ejs                    # Resource template with tabs to filter
│       ├── trainerQuickView.ejs            # Template for individual business previews
│       └── uploadFile.ejs                  # Template for file upload inputs in forms
│   ├── about.ejs                           # Page with our team members names
│   ├── accountDeletion.ejs                 # Page for confirming your account deletion
│   ├── addDog.ejs                          # Page for adding a dog to your profile
│   ├── businessAlerts.ejs                  # Page for viewing your alerts as a business
│   ├── businessLogin.ejs                   # Business login card
│   ├── businessProfile.ejs                 # Page for viewing your profile as business
│   ├── calendarBusiness.ejs                # Business-side Calendar page
│   ├── calendarClient.ejs                  # Client-side Calendar page
│   ├── chatBusiness.ejs                    # Business-side direct messaging page
│   ├── chatClient.ejs                      # Client-side direct messaging page
│   ├── chatSelectClient.ejs                # Client list for business user to messaging page
│   ├── checkInbox.ejs                      # A page that informs it’s visitors that their email has been sent
│   ├── clientAlerts.ejs                    # Page for viewing your alerts as a client
│   ├── clientList.ejs                      # Page that displays a business user’s clients
│   ├── clientLogin.ejs                     # Page that displays the signup form for clients
│   ├── clientProfile.ejs                   # Page for viewing your profile as a client
│   ├── clientResources.ejs                 # Page dedicated to displaying reliable dog resources
│   ├── clientViewTrainer.ejs               # Page for viewing a specific trainer as a client
│   ├── dogProfile.ejs                      # Page for viewing a specific dog
│   ├── dogProfileView.ejs                  # Page for business owners to view their client’s dog
│   ├── email.ejs                           # The password reset template that resides in the email
│   ├── errorMessage.ejs                    # Page that supports custom error messages
│   ├── FAQ.ejs                             # Page that displays frequently asked questions
│   ├── forgotPassword.ejs                  # Page to send unique password reset link to a valid email address
│   ├── hireTrainer.ejs                     # Page for registering a dog into a specific program
│   ├── index.ejs                           # Homepage
│   ├── passwordChangedSuccessfully.ejs     # Page that informs user that their password change is successful
│   ├── programDetails.ejs                  # Page for viewing a specific program you created as business
│   ├── reminderEmail.ejs                   # Session Reminder email template
│   ├── resetPasswordForm.ejs               # Page dedicated to allowing user to reset their password upon validation
│   ├── sessionAlertView.ejs                # Page to accept or declinen session requests
│   ├── sessionsBusiness.ejs                # Business-side Sessions list page
│   ├── sessionsClient.ejs                  # Client-side Sessions list page
│   ├── viewingClientProfile.ejs            # A page for a business account to view clients
└── └── viewTrainers.ejs                    # Page for viewing all trainers as a client
```

## 11. Credits, References and Licenses
- All images were either created by Eugenie or are free-use
- Links within our Resources page
    - https://www.akc.org/
    - https://www.ckc.ca/en
    - https://www.ukcdogs.com/
    - https://www.thesprucepets.com/signs-of-a-bad-breeder-1117328
    - https://www.familypaws.com/
    - https://www.leadingedge-dog-show-academy.com/
    - https://dogshow.ca/en
    - https://www.canuckdogs.com/
    - https://capdt.ca/learn-about-dog-sports/scent-detection-nosework/

## 12. AI Use
- ChatGPT

## 13. Contact Information
- catherinerqueenan@gmail.com
- kvnbanunu@gmail.com
- eugenie.kim@outlook.com
- filip.budd@gmail.com
- evin4369@gmail.com
