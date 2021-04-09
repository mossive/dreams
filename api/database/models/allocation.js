const { Schema } = require("mongoose");

const AllocationSchema = new Schema({
  organizationId: { type: Schema.Types.ObjectId, required: true, index: true },
  eventId: { type: Schema.Types.ObjectId, required: true, index: true },
  eventMemberId: { type: Schema.Types.ObjectId, required: true },
  amount: { type: Number, required: true },
});

module.exports = AllocationSchema;
