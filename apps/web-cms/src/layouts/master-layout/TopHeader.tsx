

import { useNavigate } from 'react-router-dom';
function TopHeader() {
	const navigate = useNavigate();
	const handleLogout = () => {
		// Logic for handling logout
		// console.log("User logged out");
		// cache.remove(LOCAL_USER_KEY);
		navigate('/login')
	}
	return (
		<>
			<p>TopHeader</p>
			{/* <Button onClick={handleLogout}>Logout</Button> */}
		</>
	);
}

export default TopHeader;