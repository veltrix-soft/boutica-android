# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Rappels

Dans **Paramètres > Configurer les rappels**, activez les rappels quotidiens de stock, de créances à suivre ou de ventes, puis choisissez l’heure. Vous pouvez aussi programmer un rappel personnalisé à une date et une heure précises. Les notifications sont planifiées sur l’appareil et peuvent être reçues lorsque l’application est fermée; l’autorisation des notifications doit être accordée.

La section **Alertes du serveur** permet d’activer les alertes de stock faible et de nouvelle vente. Elles sont envoyées aux appareils inscrits après une vente ou le passage du stock à 5 unités ou moins. Les rappels de créances invitent à vérifier le suivi manuellement : le serveur ne fournit pas encore de données de créances.

Les alertes serveur nécessitent une connexion Internet, une permission de notification, un projet EAS et des identifiants APNs/FCM configurés pour le build de production. Les notifications push ne sont pas prises en charge dans Expo Go sur Android : utilisez un build de développement ou de production. Le serveur doit aussi avoir reçu la migration Drizzle `0002_cloudy_scarlet_spider.sql`.

Pour Android, `app.json` référence `./google-services.json`, qui doit provenir de l’application Firebase dont le package Android est exactement `com.boutica.gestion`. Ajoutez aussi la clé de compte de service FCM v1 du même projet Firebase aux identifiants Android d’EAS. Ne placez jamais cette clé privée dans le dépôt. Expo Push utilise ensuite le jeton Expo obtenu avec `getExpoPushTokenAsync`, pas un jeton FCM natif.

Le profil EAS `preview` produit un APK Android et une application iOS de distribution interne pour les tests. L’identifiant Android et le bundle ID iOS sont tous deux `com.boutica.gestion`. Après avoir fourni `google-services.json` et configuré FCM v1 sur EAS, lancez `npx eas-cli@latest build --profile preview --platform android`. Pour iOS, configurez séparément les identifiants Apple/APNs puis lancez `npx eas-cli@latest build --profile preview --platform ios`.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
