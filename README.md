# MatbutikkApp

MatbutikkApp is a mobile grocery store application built with **React Native, Expo and TypeScript**.  
The app allows customers to view current offers and new products, create an account, like products and offers, and access app-exclusive offers.

The application also includes an **admin panel** where store administrators can manage the content shown to customers.

## Features

### Customer
- View active store offers with:
  - Original price
  - Offer price
  - Discount percentage
  - Offer duration
  - Product image
- View newly added products
- Like and unlike products and offers
- Create an account and log in
- Edit personal information
- App-based offer verification screen
- Persistent login between app sessions

### Admin
- Add new offers
- Add new products
- Upload and automatically compress images
- Edit existing offers and products
- Activate or hide content
- Delete offers and products
- View like statistics and popularity rankings

## Main Pages

The customer interface uses bottom-tab navigation:

- **Tilbud** – Shows active offers from the store
- **Nye produkter** – Shows recently added products
- **Profil** – Login, registration and account settings

Additional pages include:

- **Personopplysninger** – Edit account information
- **Tilbudskontroll** – Used to verify that a customer has the app
- **Adminpanel** – Store administration
- **Administrer tilbud**
- **Administrer produkter**
- **Legg til / rediger tilbud**
- **Legg til / rediger produkt**
- **Likes** – Popularity statistics

## Technologies

- **React Native**
- **Expo**
- **TypeScript**
- **Expo Router**
- **Firebase Authentication**
- **Cloud Firestore**
- **AsyncStorage**
- **Expo Image Picker**
- **Expo Image Manipulator**

Firebase is used for authentication, user roles, products, offers and like data.  
Firestore listeners keep offers, products and statistics updated in real time.

## Run the Project

### 1. Clone the repository

```bash
git clone https://github.com/Abdu299/MatbutikkApp.git
cd MatbutikkApp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start Expo

```bash
npx expo start
```

You can then open the application using:

- **Expo Go** on a physical device
- Android Emulator
- iOS Simulator
- Web browser

You can also run:

```bash
npm run android
npm run ios
npm run web
```

## Firebase

The Firebase setup is located in:

```text
firebase/firebaseConfig.ts
```

If you want to connect the application to another Firebase project, replace the Firebase configuration and configure **Firebase Authentication** and **Cloud Firestore** for the new project.

## Project Structure

```text
app/
├── (tabs)/              # Customer pages
├── admin/               # Admin panel and management pages
├── offer-control.tsx
└── personal-information.tsx

context/
└── AuthContext.tsx      # Authentication and user roles

firebase/
└── firebaseConfig.ts    # Firebase configuration
```

## Purpose

The project demonstrates how a real mobile application can combine a React Native frontend with Firebase authentication, real-time cloud data, role-based functionality and an administrative content-management interface.
