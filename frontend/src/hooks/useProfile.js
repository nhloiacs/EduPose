import { useEffect, useState, buildTeacherProfile, getCurrentTeacherProfile } from '../imports';

const EMPTY_PROFILE = {
  name: '',
  email: '',
  role: '',
  nip: '',
  school: '',
  subject: '',
  deviceIP: '',
  deviceName: '',
  cameraRes: '',
  detectionModel: '',
  autoRecord: false,
  pushNotification: false,
  sleepThreshold: 0,
  unfocusThreshold: 0,
  photoFilepath: '',
  avatarInitials: '',
};

/**
 * Owns the profile/settings form and keeps it in sync with the logged in user.
 */
export function useProfile({ authToken, currentUser, setCurrentUser }) {
  const [profileData, setProfileData] = useState(EMPTY_PROFILE);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    setProfileData((previousProfile) => buildTeacherProfile(currentUser, previousProfile));
  }, [currentUser]);

  useEffect(() => {
    let isActive = true;

    const loadCurrentProfile = async () => {
      if (!authToken) return;

      try {
        const response = await getCurrentTeacherProfile(authToken);
        if (!isActive || !response.data) return;

        const profile = response.data;
        setCurrentUser((previousUser) => ({ ...previousUser, ...profile }));
        setProfileData((previousProfile) => ({
          ...buildTeacherProfile(profile, previousProfile),
          nip: profile.nip || '',
        }));
      } catch (error) {
        if (isActive) {
          setProfileError(
            error instanceof Error ? error.message : 'Profil tidak dapat dimuat dari backend.',
          );
        }
      }
    };

    loadCurrentProfile();
    return () => { isActive = false; };
  }, [authToken, setCurrentUser]);

  const handleSaveProfile = (event) => {
    event.preventDefault();
    setProfileError(
      'Pembaruan profil belum dapat dikirim: endpoint backend hanya mengizinkan PATCH /teachers/{teacher_id} untuk role principal, sedangkan profil saat ini tidak menyediakan endpoint update mandiri.',
    );
  };

  return { profileData, setProfileData, profileError, handleSaveProfile };
}

export default useProfile;
