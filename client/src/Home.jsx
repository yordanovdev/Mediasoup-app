import { useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import { RoomOverview } from "./components/RoomOverview";
import axios from "axios";

export const getRooms = async () => {
  const response = await axios.get("https://localhost:3000/rooms");
  return response.data;
};

export const Home = () => {
  const { data: rooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getRooms(),
    refetchIntervalInBackground: 20000,
  });
  const navigate = useNavigate();

  const onSubmit = (e) => {
    e.preventDefault();
    const elements = new FormData(e.target);
    let roomId = elements.get("roomId");
    if (!roomId) return;

    roomId = roomId.trim().toLowerCase();

    navigate(`/room/${roomId}`);
  };
  return (
    <div className="flex items-center flex-col gap-3 justify-center p-10">
      <form
        className="bg-slate-600 px-6 py-3 rounded-md shadow-md"
        onSubmit={onSubmit}
      >
        <input
          className="p-2 text-lg outline-none bg-transparent"
          placeholder="Enter room id here:"
          name="roomId"
        />
        <button className="bg-sky-600 px-3 py-2 rounded-md font-semibold uppercase">
          Enter
        </button>
      </form>
      <div className="flex gap-3 mt-3">
        {rooms?.map((room) => (
          <RoomOverview key={room.roomId} room={room} />
        ))}
      </div>
    </div>
  );
};
