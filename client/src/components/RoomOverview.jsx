import { useNavigate } from "react-router";

export const RoomOverview = ({ room }) => {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/room/${room.roomId}`)}
      key={room.roomId}
      className="cursor-pointer bg-slate-600 w-52 overflow-hidden rounded-md shadow-lg flex items-center p-4 justify-between gap-5"
    >
      <h1 className="font-bold truncate">
        {capitalizeFirstLetter(room.roomId)}
      </h1>
      <p className="bg-sky-600 rounded-full p-1 px-3">{room.length}</p>
    </div>
  );
};

function capitalizeFirstLetter(str) {
  if (str.length === 0) {
    return str;
  }

  return str.charAt(0).toUpperCase() + str.slice(1);
}
