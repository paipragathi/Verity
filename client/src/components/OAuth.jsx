import { Alert, Button } from 'flowbite-react';
import { useState } from 'react';
import { AiFillGoogleCircle } from 'react-icons/ai';
import { GoogleAuthProvider, signInWithPopup, getAuth } from 'firebase/auth';
import { app } from '../firebase';
import { useDispatch } from 'react-redux';
import { signInSuccess } from '../redux/user/userSlice';
import { useNavigate } from 'react-router-dom';

// Maps Firebase's internal error codes to a message a user can actually
// act on. Previously every failure here was swallowed by console.log(),
// so the button visibly did nothing on click no matter what went wrong —
// popup blocked, unauthorized domain, provider disabled, etc all looked
// identical to the user (nothing happened).
function describeAuthError(error) {
    switch (error?.code) {
        case 'auth/popup-blocked':
            return 'Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.';
        case 'auth/popup-closed-by-user':
            return 'Sign-in was cancelled — the popup was closed before completing.';
        case 'auth/unauthorized-domain':
            return 'This domain is not authorized for Google sign-in yet. (Admin: add it under Firebase Console -> Authentication -> Settings -> Authorized domains.)';
        case 'auth/operation-not-allowed':
            return 'Google sign-in is not enabled for this project. (Admin: enable it under Firebase Console -> Authentication -> Sign-in method.)';
        default:
            return error?.message || 'Google sign-in failed. Please try again.';
    }
}

export default function OAuth() {
    const [errorMessage, setErrorMessage] = useState(null);
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const handleGoogleClick = async () => {
        setErrorMessage(null);

        // app is null if VITE_FIREBASE_API_KEY wasn't set at build time
        // (see firebase.js) — fail with a clear message instead of an
        // uncaught exception from getAuth(null).
        if (!app) {
            setErrorMessage('Google sign-in is currently unavailable.');
            return;
        }

        const auth = getAuth(app)
        const provider = new GoogleAuthProvider()
        provider.setCustomParameters({ prompt: 'select_account' })
        try {
            const resultsFromGoogle = await signInWithPopup(auth, provider)
            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: resultsFromGoogle.user.displayName,
                    email: resultsFromGoogle.user.email,
                    googlePhotoUrl: resultsFromGoogle.user.photoURL,
                }),
                })
            const data = await res.json()
            if (res.ok){
                dispatch(signInSuccess(data))
                navigate('/')
            } else {
                setErrorMessage(data.message || 'Google sign-in failed on the server.');
            }
        } catch (error) {
            console.error('Google sign-in error:', error);
            setErrorMessage(describeAuthError(error));
        }
    }

  return (
    <div className='flex flex-col gap-3'>
        <Button
            type='button'
            gradientDuoTone='pinkToOrange'
            outline
            disabled={!app}
            title={!app ? 'Google sign-in is temporarily unavailable' : undefined}
            onClick={handleGoogleClick}
        >
            <AiFillGoogleCircle className='w-6 h-6 mr-2'/>
            {app ? 'Continue with Google' : 'Google sign-in unavailable'}
        </Button>
        {errorMessage && (
            <Alert color='failure'>{errorMessage}</Alert>
        )}
    </div>
  )
}
