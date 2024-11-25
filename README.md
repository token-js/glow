# Getting started guide

## Prerequisites
You'll need the following tools installed.
- xcode
- xcode command line tools (`xcode-select --install`)

## 1. Install Dependencies

In the project root, run:
```sh
npm install
```

Then install the Python dependencies:
```sh
python -m venv .venv && source .venv/bin/activate && pip install -r server/requirements.txt
```

## 2. Fill out .env file
There's a template of the variables required in `.env.example`. Ryan will send you a copy of this file with as many filled in as possible.

## 3. Run the backend services
```sh
npm run start:server
```

## 4. Setup expo and run the app on the simulator
Run through this guide to get Expo setup and run the app for the first time:
https://docs.expo.dev/get-started/set-up-your-environment/?platform=ios&device=simulated&mode=development-build&buildEnv=local

Please note the following:
- You should follow the guide for the iOS simulator with the development build and *not* using Expo Application Services. The link above should take you to exactly what you need to do.
- Once you've run the app for the first time, you should see a QR code and a list of commands. If you then just press `i` the simulator should start up.
- Voice calls *do not* work on the simulator. This is expected behavior. You can only test the calls on a real device. The rest of the app should work correctly.
- If you want to, you can use this short hand to start the app in the future `npm run ios`

## 5. Install the app on your phone
```sh
npm run ios:device
```

You should be prompted to select a device and one of the options should be your phone. If you do not see your phone, you may need to plug your phone directly into your computer using a USB cable, but this is typically not necessary at least for me.

Once the app is installed on your phone, you'll probably get a crash or something because you're phone doesn't trust your development profile. To resolve this, you need to go into your phone Settings > VPN & Device Management and then click the button to trust the developer app.

Then run this command:
```sh
npm run ios
```

Finally, scan the QR code in the terminal and the app should be opened on your phone.

# Using Supabase Local
Developing with a locally running version of Supabase ensures your work does not interfere with others. Here are the steps to get started with Supabase local.

## 1. Install or Upgrade Supabase CLI
Install:
```
brew install supabase/tap/supabase
```

Upgrade:
```
brew upgrade supabase
```

## 2. Start Supabase Instance
```
supabase start
```

Take note of the output, you'll need some of the values output here for step 4.

## 3. Get your Macbooks hostname
Run this command and take note of the result. This is a domain that is only valid on your Wifi network and will allow you to access the local Supabase instance from a real device when working on the app.
```
hostname
```

## 4. Setup Supabase Environment variables
You'll need to update a few environment variables to point at your local Supabase instance. You'll also need to update your Supabase acess keys to work with the local instance.

Substitute `<hostname>` for the result from the previous step.
```
EXPO_PUBLIC_SUPABASE_URL=http://<hostname>:54321
EXPO_PUBLIC_API_URL=<hostname>

DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
DIRECT_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

EXPO_PUBLIC_SUPABASE_ANON_KEY=<output by step 2>
SUPABASE_JWT_SECRET=<output by step 2>
SUPABASE_SECRET_KEY=<output by step 2>
```

## 5. Setup DB schema
We are not using the Supabase DB migration tooling. Instead, we are using Prisma. So whenever we startup a local Supabase instance, we have to setup the DB with out schema:
```
npm run prisma:reset
```

## Configuring Supabase
When working with Supabase, you may need to occasionally update settings or other configuration (like enabling new authentication providers for example). If/when you need to do this, you *must* make sure that you make the configuration changes in the `supabase/config.toml` file and *not* using the local studio UI. The reason for this is to ensure that your changes can be replicated by others in their local environments.

Of course, when deploying to the staging and production environments you must also make sure those environments are configured correctly for your changes.