import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../context/AuthContext';
import { updateProfile as updateProfileAPI } from '../api/api';

const ProfileContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background: linear-gradient(135deg, #eef2ff 0%, #f7f8fb 60%, #ffffff 100%);

  .dark-mode & {
    background: radial-gradient(circle at top, rgba(30, 41, 59, 0.82) 0%, #0b1120 70%);
  }
`;

const ProfileCard = styled.div`
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 0 36px 60px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(14px);
  overflow: hidden;
  max-height: 78vh;
  display: flex;
  flex-direction: column;

  .dark-mode & {
    background: rgba(17, 24, 39, 0.9);
    box-shadow: 0 36px 60px rgba(2, 6, 23, 0.6);
    border: 1px solid rgba(148, 163, 184, 0.15);
  }

  @media (max-height: 720px) {
    max-height: 76vh;
  }

  @media (max-width: 520px) {
    max-width: 92vw;
  }
`;

const ProfileHeader = styled.div`
  padding: 18px 24px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  display: flex;
  align-items: center;
  gap: 15px;

  h2 {
    font-size: 1.5rem;
    color: #111827;
  }

  .dark-mode & {
    border-bottom-color: rgba(148, 163, 184, 0.16);
  }
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: #667eea;
  font-size: 1rem;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 5px;
  transition: background 0.2s;

  &:hover {
    background: #f3f4f6;
  }
`;

const ProfileContent = styled.div`
  padding: 20px 24px 22px;
  overflow-y: auto;

  @media (max-height: 720px) {
    padding: 18px 22px 20px;
  }

  @media (max-width: 520px) {
    padding: 18px 20px 20px;
  }
`;

const ProfileAvatarSection = styled.div`
  text-align: center;
  margin-bottom: 22px;

  h3 {
    font-size: 1.4rem;
    color: #0f172a;
    margin-bottom: 4px;

    .dark-mode & {
      color: #f8fafc;
    }
  }

  p {
    color: #64748b;
    font-size: 0.95rem;

    .dark-mode & {
      color: #94a3b8;
    }
  }
`;

const ProfileAvatarLarge = styled.div`
  width: 104px;
  height: 104px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 2.6rem;
  margin: 0 auto 14px;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s;
  cursor: pointer;

  &:hover {
    transform: scale(1.04);
  }

  &:hover .avatar-upload-overlay {
    opacity: 1;
  }

  @media (max-height: 720px) {
    width: 96px;
    height: 96px;
    font-size: 2.3rem;
  }
`;

const ProfileAvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
`;

const AvatarUploadOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  border-radius: 50%;
  color: white;
  font-size: 0.9rem;
  gap: 5px;

  span:first-child {
    font-size: 1.5rem;
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const ProfileForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-weight: 500;
    color: #1f2937;
    font-size: 0.9rem;

    .dark-mode & {
      color: #e2e8f0;
    }
  }

  input, textarea {
    padding: 11px;
    border: 1px solid rgba(148, 163, 184, 0.45);
    border-radius: 10px;
    font-size: 0.98rem;
    transition: border-color 0.2s, box-shadow 0.2s;
    background: rgba(255, 255, 255, 0.9);

    &:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }

    .dark-mode & {
      background: rgba(15, 23, 42, 0.75);
      border-color: rgba(148, 163, 184, 0.25);
      color: #f8fafc;

      &:focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.3);
      }
    }
  }

  textarea {
    resize: vertical;
    min-height: 120px;
  }

  input.disabled-input {
    background: #f3f4f6;
    color: #6b7280;
    cursor: not-allowed;
  }

  small {
    color: #6b7280;
    font-size: 0.85rem;
  }
`;

const SaveButton = styled.button`
  padding: 12px;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s;
  box-shadow: 0 14px 30px rgba(79, 70, 229, 0.22);

  &:hover {
    opacity: 0.95;
    transform: translateY(-1px);
    box-shadow: 0 18px 36px rgba(79, 70, 229, 0.28);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ProfileActions = styled.div`
  margin-top: 12px;
  padding-top: 14px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
`;

const LogoutButton = styled.button`
  width: 100%;
  padding: 11px;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 10px;
  font-size: 0.98rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;

  &:hover {
    background: #fecaca;
    transform: translateY(-1px);
  }

  .dark-mode & {
    background: rgba(248, 113, 113, 0.16);
    color: #fca5a5;

    &:hover {
      background: rgba(248, 113, 113, 0.24);
    }
  }
`;

const ErrorMessage = styled.div`
  padding: 12px;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 0.9rem;
`;

const SuccessMessage = styled.div`
  padding: 12px;
  background: #d1fae5;
  color: #065f46;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 0.9rem;
`;

const Profile = () => {
  const { user, logout, fetchUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [previewUrl, setPreviewUrl] = useState(user?.avatarUrl || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [about, setAbout] = useState(user?.about || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when user data changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatarUrl(user.avatarUrl || '');
      setPreviewUrl(user.avatarUrl || '');
      setPhone(user.phone || '');
      setAbout(user.about || '');
    }
  }, [user]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setAvatarUrl(base64String);
      setPreviewUrl(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await updateProfileAPI({
        name,
        avatarUrl,
        phone,
        about,
      });
      if (result.success) {
        setSuccess('Profile updated successfully!');
        // Refresh user data
        await fetchUser();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <ProfileContainer>
      <ProfileCard>
        <ProfileHeader>
          <BackButton onClick={() => navigate('/chats')}>
            ← Back
          </BackButton>
          <h2>Profile</h2>
        </ProfileHeader>

        <ProfileContent>
          <ProfileAvatarSection>
            <ProfileAvatarLarge onClick={handleAvatarClick}>
              {previewUrl ? (
                <ProfileAvatarImage 
                  src={previewUrl} 
                  alt="Profile"
                />
              ) : (
                <span>{name?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase()}</span>
              )}
              <AvatarUploadOverlay className="avatar-upload-overlay">
                <span>📷</span>
                <span>Change Photo</span>
              </AvatarUploadOverlay>
            </ProfileAvatarLarge>
            <HiddenFileInput
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            <h3>{name || user?.name}</h3>
            <p>{user?.email}</p>
          </ProfileAvatarSection>

          {error && <ErrorMessage>{error}</ErrorMessage>}
          {success && <SuccessMessage>{success}</SuccessMessage>}

          <ProfileForm>
            <FormGroup>
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </FormGroup>

            <FormGroup>
              <label>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Add your phone number"
              />
              <small>Use a number where contacts can reach you.</small>
            </FormGroup>

            <FormGroup>
              <label>Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="disabled-input"
              />
              <small>Email cannot be changed</small>
            </FormGroup>

            <FormGroup>
              <label>About</label>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Tell others a bit about yourself"
                rows={4}
              />
              <small>Share your role, interests, or a short bio.</small>
            </FormGroup>

            <SaveButton 
              onClick={handleSave} 
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </SaveButton>

            <ProfileActions>
              <LogoutButton onClick={logout}>
                Logout
              </LogoutButton>
            </ProfileActions>
          </ProfileForm>
        </ProfileContent>
      </ProfileCard>
    </ProfileContainer>
  );
};

export default Profile;
