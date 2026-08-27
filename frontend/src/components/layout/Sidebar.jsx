import {
  BookOpen,
  Calendar,
  Camera,
  LayoutDashboard,
  Settings,
  User,
  Users,
  Video,
  logoEdupose,
  Avatar,
} from '../../imports';
import '../../styles/profileCard.css';

function MenuItem({ id, icon: Icon, label, activeTab, onSelect }) {
  return (
    <button
      className={`menu-item ${activeTab === id ? 'active' : ''}`}
      onClick={() => onSelect(id)}
    >
      <Icon size={20} />
      <span className="menu-label">{label}</span>
    </button>
  );
}

export default function Sidebar({ activeTab, onSelectTab, currentUser, avatarInitials, photoFilepath }) {
  const isPrincipal = currentUser?.role === 'principal';
  const isTeacher = currentUser?.role === 'teacher';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img className="sidebar-logo-image" src={logoEdupose} alt="EduPose logo" />
        <span className="logo-text">EduPose</span>
      </div>

      <nav className="sidebar-menu">
        <MenuItem id="dashboard" icon={LayoutDashboard} label="Dashboard" activeTab={activeTab} onSelect={onSelectTab} />
        <MenuItem id="live" icon={Video} label="Live" activeTab={activeTab} onSelect={onSelectTab} />

        {isPrincipal && (
          <MenuItem id="cameras" icon={Camera} label="Kamera" activeTab={activeTab} onSelect={onSelectTab} />
        )}

        {isPrincipal && (
          <MenuItem id="teachers" icon={User} label="Guru" activeTab={activeTab} onSelect={onSelectTab} />
        )}

        <MenuItem id="sessions" icon={Calendar} label="Sesi" activeTab={activeTab} onSelect={onSelectTab} />

        {!isTeacher && (
          <>
            <MenuItem id="students" icon={Users} label="Siswa" activeTab={activeTab} onSelect={onSelectTab} />
            <MenuItem id="classrooms" icon={BookOpen} label="Kelas" activeTab={activeTab} onSelect={onSelectTab} />
          </>
        )}

        <MenuItem id="profile" icon={Settings} label="Profil" activeTab={activeTab} onSelect={onSelectTab} />
      </nav>

      <div className="sidebar-profile" onClick={() => onSelectTab('profile')}>
        <div className="avatar-wrapper">
          {photoFilepath ? (
            <Avatar name={currentUser?.name} photo={photoFilepath} size={38} />
          ) : (
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{avatarInitials}</span>
          )}
        </div>
      </div>
    </aside>
  );
}
