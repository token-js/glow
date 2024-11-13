# Getting started guide

## Prerequisites
You'll need the following tools installed.
- [ngrok](https://ngrok.com/)
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

You will need to fill in your own `EXPO_PUBLIC_API_URL` which should be your NGROK url. This is unique to your NGROK account. You should already have one from when we were working on the first iteration which used phone calls. 

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