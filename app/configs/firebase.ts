// // Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAuth } from "firebase/auth";
// import { getFirestore } from "firebase/firestore";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// // For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//   apiKey: "AIzaSyCZqKAYpMrEP97z3moxnWEoz2Ui9JE9LVI",
//   authDomain: "sign-in-3d786.firebaseapp.com",
//   databaseURL: "https://sign-in-3d786.firebaseio.com",
//   projectId: "sign-in-3d786",
//   storageBucket: "sign-in-3d786.firebasestorage.app",
//   messagingSenderId: "961397863870",
//   appId: "1:961397863870:web:ec90f4fb948182267cf5ef",
//   measurementId: "G-9SXBRWFXFN"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// export const auth = getAuth(app);
// export const firestore = getFirestore(app);


import admin from 'firebase-admin';

if(!admin.apps.length){
  const FIREBASE_SERVICE_ACCOUNT={
  "type": "service_account",
  "project_id": "",
  "private_key_id": "",
  "private_key": "",
  "client_id": "",
  "client_email": "",
  "auth_uri": "",
  "token_uri": "",
  "auth_provider_x509_cert_url": "",
  "client_x509_cert_url": "",
  "universe_domain": ""
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: FIREBASE_SERVICE_ACCOUNT.project_id,
    clientEmail: FIREBASE_SERVICE_ACCOUNT.client_email,
    privateKey: FIREBASE_SERVICE_ACCOUNT.private_key,
  }),
})
}

export const firebase = admin.firestore();