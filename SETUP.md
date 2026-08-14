# Push notification setup

## 1. Install packages in the Expo app

```bash
npx expo install expo-notifications expo-constants
```

## 2. Initialize EAS

```bash
npm install -g eas-cli
eas login
eas init
```

`eas init` normally adds `extra.eas.projectId` to `app.json`.

## 3. Deploy the push server

Create a new Vercel project whose root directory is `push-server`.

Add these environment variables in Vercel:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `EXPO_ACCESS_TOKEN` is optional

The first three values come from a Firebase service-account JSON file:
Firebase Console -> Project settings -> Service accounts -> Generate new private key.
Never commit or share that JSON file.

After deployment, copy the API URL into a `.env` file in the Expo app:

```env
EXPO_PUBLIC_PUSH_API_URL=https://YOUR-PUSH-SERVER.vercel.app/api/send-push
```

Restart Metro after changing `.env`:

```bash
npx expo start --clear
```

## 4. Publish Firestore rules

Copy the complete `firestore.rules` content into:
Firebase Console -> Firestore Database -> Rules -> Publish.

## 5. Make a development build

Push notifications do not work in Expo Go. Build and install a development client:

```bash
eas build --profile development --platform ios
```

or:

```bash
eas build --profile development --platform android
```

When EAS asks to configure push-notification credentials, accept it.

## 6. Test

1. Install the development build on a device.
2. Log in with a normal user and allow notifications.
3. Log in as admin on another device.
4. Publish an offer or product.
5. The normal user should receive a notification.
6. Tapping it opens the matching detail page.
