// // Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAuth } from "firebase/auth";
// import { getFirestore } from "firebase/firestore";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// // For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//  
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
