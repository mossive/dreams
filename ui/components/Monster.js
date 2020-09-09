import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { CloseIcon } from "components/Icons";
import ExpandButton from "components/ExpandButton";

const GUIDELINE = "GUIDELINE";
const MESSAGE = "MESSAGE";

const messagesBeforeGuidelines = [
  { type: MESSAGE, message: "Argh! Please help me review this dream!" },
  {
    type: MESSAGE,
    message: "Here are the guidelines that dreams need to follow:",
  },
];

const messagesAfterGuidelines = [
  { type: MESSAGE, message: "Does this dream comply with these guidelines?" },
];

const GuidelineComponent = ({ guideline }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative w-full">
      <h2 className="mb-1 font-semibold">{guideline.title}</h2>
      <div
        className={expanded ? "" : "line-clamp-2"}
        style={{ minHeight: "36px" }}
      >
        <ReactMarkdown
          source={guideline.description}
          className="markdown text-sm "
        />
      </div>

      <ExpandButton expanded={expanded} setExpanded={setExpanded} />
    </div>
  );
};

const Monster = ({ event }) => {
  const [open, setOpen] = useState(false);
  const [bubbleOpen, setBubbleOpen] = useState(true);
  const closeBubble = () => setBubbleOpen(false);

  const guidelines = event.guidelines.map((guideline) => ({
    type: GUIDELINE,
    guideline,
  }));

  const chatItems = [
    ...messagesBeforeGuidelines,
    ...guidelines,
    ...messagesAfterGuidelines,
  ];

  const renderChatItem = (item) => {
    switch (item.type) {
      case MESSAGE:
        return item.message;
      case GUIDELINE:
        return <GuidelineComponent guideline={item.guideline} />;
    }
  };
  return (
    <div
      className={
        "fixed right-0 bottom-0 p-4 z-30 flex flex-col items-end max-w-6xl"
      }
    >
      {open && (
        <div
          className={`bg-gray-100 rounded-lg shadow-lg border-${event.color} overflow-hidden border-3 w-100`}
        >
          <div
            className={`bg-${event.color} text-lg text-white p-3 font-semibold flex items-center justify-center relative`}
          >
            <div className="">Review Monster</div>
            <button
              className="absolute mr-2 right-0 "
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
          <div className="p-4 flex flex-col items-start overflow-y-scroll h-148">
            {chatItems.map((item, i) => (
              <div
                className="text-gray-800 bg-white shadow p-3 mb-2 rounded"
                key={i}
              >
                {renderChatItem(item)}
              </div>
            ))}
          </div>
        </div>
      )}

      {bubbleOpen && !open && (
        <>
          <div
            className="relative bg-white text-gray-800 w-64 cursor-pointer rounded-lg p-4 shadow-lg mb-2 animation-once animation-fade-in"
            onClick={() => {
              setOpen(true);
              closeBubble();
            }}
          >
            {messagesBeforeGuidelines[0].message}
            <button
              className="absolute p-1 m-1 top-0 right-0 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full"
              onClick={closeBubble}
              tabIndex="-1"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      {!open && (
        <img
          onClick={() => setOpen(!open)}
          className="w-40 cursor-pointer animate-wiggle hover:animate-none"
          src="/calm-monster.gif"
        />
      )}
    </div>
  );
};

export default Monster;
