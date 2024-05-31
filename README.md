# PawFolio
Pawfolio, a user-friendly dog training web application and booking service, to help owners and reputable trainers connect without being bogged down from poor software and rampant industry misinformation by providing a single organized source and tool for their needs.

## 1. Project Description
### Key Features of Pawfolio:
- 1. User Interfaces
    We at Pawfolio understand the needs of both business owners and pet owners alike. That's why we've created a cohesive application to help connect pet owners with reputable trainers.
    - Business Interface (Trainers):
        - Dashboard to manage training sessions.
        - Full Calendar integration for booking and managing sessions
        - Real-time chat system built in-house.
        - Different alerts for new client inquiries, session/hiring requests, and more.
    - Client Interface (Dog Owners):
        - Easy session request booking with visible availability of their assigned trainer.
        - Real-time chat system to contact trainers directly through the app.
        - Access to curateed and verified resources.
- 2. Database Management
    - When a user signs up, an individual user is created for that user in MongoDB.
    - BCrypt is used to encrypt all sensitive information.
    - Different user types have different permissions, useful for giving trainers the ability to adjust financial information on their clients' profiles.
- 3. File Management
    - Photos are hosted on Cloudinary.
    - PDFs are encrypted using BCrypt and stored on a Google Cloud Storage bucket.
    - PDFs are viewable in-app using BlobsJS.
- 4. Communication and Notifications
    - Real-Time Chat
        - Our real-time chat system was built entirely in-house using Javascript.
        - Allows users to contact their trainers directly through the application.
        - Chat messages are encrypted with BCrypt.
    - Email Notifications
        - Nodemailer is used for sending reminder emails and password reset links.
        - Crypto is used to generate unique tokens for password resets.
- 5. Security
    - BCrypt encrypts all messages and user information.
    - Secure storage handling of user data on Google Cloud Storage using BCrypt
- 6. Scheduling
    - Customized Full Calendar for booking appointments on both the client side and business side.
    - Automated scheduling and reminders for vaccination expiries via node-cron.

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
- smt
	- smt indented

## 4. Complete Setup/Installation/Usage Guide
- 1. Clone the repository
	- `git clone https://github.com/Catherine-Queenan/2800-202410-BBY05.git`
- 2. Navigate to the project directory
	- `cd 2800-202410-BBY05`
- 3. Install dependencies
	- `npm i`
- 4. Start the server
	- `node index.js`

## 5. Known Bugs and Limitations


## 6. Features for the Future


## 7. Database Cluster Structure:
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
│   ├── outstandingBalace
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

## 8. Contents of Folder
```
├── .gitignore                              # Specifies files to be ignored by Git
├── .databaseStructure.txt                  # The structure of our database cluster
├── index.js                                # Main server file
├── package.json                            # Manages project dependencies
├── README.md                               # This file
├── utils.js                                # Defines the include function
├── public/                                 # Contains public assets like images, stylesheets, and scripts
│   ├── audio/                              # Audio files
│       └── whoLetThemDawgsOutFinal.wav     # 
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
│       ├── DefaultAvatar.png               # 
│       ├── DogBackdrop.pns                 # 
│       ├── DogRunning.gif                  # 
│       ├── DogShow.png                     # 
│       ├── errorDog.png                    # 
│       ├── FamilyPaws.png                  # 
│       ├── Favicon.ico                     # 
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
│       ├── addDog.js                       # 
│       ├── calendarBusiness.js             # Script for the main calendar for a business user
│       ├── calendarBusinessHome.js         # Script for the business homepage calendar card
│       ├── calendarBusinessSessions.js     # Script for the business sessions list
│       ├── calendarClient.js               # Script for the main calendar for a client user
│       ├── calendarClientHome.js           # Script for the client homepage calendar card
│       ├── calendarClientSessions.js       # Script for the client sessions list
│       ├── chatBusiness.js                 # Script for messaging on the business side
│       ├── chatClient.js                   # Script for messaging on the client side
│       ├── clientDogsHome.js               # 
│       ├── clientListHome.js               # 
│       ├── clientSearch.js                 # 
│       ├── clientTrainerHome.js            # 
│       ├── easterEgg.js                    # 
│       ├── editProfile.js                  # 
│       ├── global.js                       # 
│       ├── messagePreview.js               # Script for the business homepage unread messages card
│       └── signUp.js                       # 
├── views/                                  # Contains EJS templates for rendering HTML
│   └── templates/                          # Nested templates
│       ├── accordion.ejs                   # 
│       ├── alertHireRequest.ejs            # 
│       ├── alertSessionRequest.ejs         # Template for the session request card
│       ├── alertVaccineUpdate.ejs          # 
│       ├── businessServiceBox.ejs          # 
│       ├── button.ejs                      # 
│       ├── checkmark.ejs                   # 
│       ├── clientPreview.ejs               # 
│       ├── clients.ejs                     # Template for chat client select
│       ├── clientViewProgram.ejs           # 
│       ├── dateInput.ejs                   # 
│       ├── defaultingPic.ejs               # 
│       ├── dog.ejs                         # 
│       ├── dogToTrainClient.ejs            # 
│       ├── dogViewingBusiness.ejs          # 
│       ├── footerCalendar.ejs              # 
│       ├── footerCopyright.ejs             # 
│       ├── footerLogin.ejs                 # 
│       ├── header.ejs                      # 
│       ├── hero.ejs                        # 
│       ├── homepage.ejs                    # 
│       ├── icon.ejs                        # 
│       ├── linkButton.ejs                  # 
│       ├── loginForms.ejs                  # 
│       ├── modalButton.ejs                 # 
│       ├── navbarBusiness.ejs              # 
│       ├── navbarBusinessHome.ejs          # 
│       ├── navbarClient.ejs                # 
│       ├── navbarEmpty.ejs                 # 
│       ├── outstandingRecord.ejs           # 
│       ├── programProfileView.ejs          # 
│       ├── resource.ejs                    # 
│       ├── trainerQuickView.ejs            # 
│       ├── trainers.ejs                    # 
│       └── uploadFile.ejs                  # 
│   ├── about.ejs                           # 
│   ├── accountDeletion.ejs                 # 
│   ├── addDog.ejs                          # 
│   ├── addEvent.ejs                        # 
│   ├── businessAlerts.ejs                  # 
│   ├── businessLogin.ejs                   # 
│   ├── businessProfile.ejs                 # 
│   ├── calendarBusiness.ejs                # Business-side Calendar page
│   ├── calendarClient.ejs                  # Client-side Calendar page
│   ├── chatBusiness.ejs                    # Business-side direct messaging page
│   ├── chatClient.ejs                      # Client-side direct messaging page
│   ├── chatSelectClient.ejs                # Client list for business user to messaging page
│   ├── checkInbox.ejs                      # 
│   ├── clientAlerts.ejs                    # 
│   ├── clientCards.ejs                     # 
│   ├── clientList.ejs                      # 
│   ├── clientLogin.ejs                     # 
│   ├── clientProfile.ejs                   # 
│   ├── clientResources.ejs                 # 
│   ├── clientViewTrainer.ejs               # 
│   ├── dogProfile.ejs                      # 
│   ├── dogProfileView.ejs                  # 
│   ├── email.ejs                           # General email template
│   ├── errorMessage.ejs                    # 
│   ├── FAQ.ejs                             # 
│   ├── findTrainer.ejs                     # 
│   ├── forgotPassword.ejs                  # 
│   ├── hireTrainer.ejs                     # 
│   ├── index.ejs                           # Homepage
│   ├── login.ejs                           # 
│   ├── logout.ejs                          # 
│   ├── passwordChangedSuccessfully.ejs     # 
│   ├── programDetails.ejs                  # 
│   ├── reminderEmail.ejs                   # Reminder email template
│   ├── removeEvent.ejs                     # 
│   ├── resetPasswordForm.ejs               # 
│   ├── sessionAlertView.ejs                # Page to accept or decline session requests
│   ├── sessionsBusiness.ejs                # Business-side Sessions list page
│   ├── sessionsClient.ejs                  # Client-side Sessions list page
│   ├── viewingClientProfile.ejs            # 
└── └── viewTrainers.ejs                    # 
```