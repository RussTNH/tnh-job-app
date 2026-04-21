const POS_LINE_WIDTH = 32;

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function money(value) {
  return `£${toNumber(value).toFixed(2)}`;
}

function safe(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function repeat(char, count) {
  return new Array(Math.max(0, count) + 1).join(char);
}

function centerText(text = "", width = POS_LINE_WIDTH) {
  const clean = safe(text);
  if (!clean) return "";
  if (clean.length >= width) return clean;

  const totalPadding = width - clean.length;
  const leftPadding = Math.floor(totalPadding / 2);

  return `${repeat(" ", leftPadding)}${clean}`;
}

function wrapText(text = "", width = POS_LINE_WIDTH) {
  const clean = safe(text);
  if (!clean) return [];

  const words = clean.split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      if (word.length <= width) {
        current = word;
      } else {
        let remaining = word;
        while (remaining.length > width) {
          lines.push(remaining.slice(0, width));
          remaining = remaining.slice(width);
        }
        current = remaining;
      }
      continue;
    }

    const test = `${current} ${word}`;
    if (test.length <= width) {
      current = test;
    } else {
      lines.push(current);

      if (word.length <= width) {
        current = word;
      } else {
        let remaining = word;
        while (remaining.length > width) {
          lines.push(remaining.slice(0, width));
          remaining = remaining.slice(width);
        }
        current = remaining;
      }
    }
  }

  if (current) lines.push(current);
  return lines;
}

function leftRight(left = "", right = "", width = POS_LINE_WIDTH) {
  const l = safe(left);
  const r = safe(right);

  if (!l && !r) return "";

  if (r.length >= width) return r.slice(0, width);

  const spaceAvailable = width - r.length;
  if (l.length >= spaceAvailable) {
    return `${l.slice(0, spaceAvailable)}${r}`;
  }

  return `${l}${repeat(" ", width - l.length - r.length)}${r}`;
}

function divider(char = "-") {
  return repeat(char, POS_LINE_WIDTH);
}

function blank() {
  return "";
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normaliseParts(parts) {
  if (!parts) return [];

  if (Array.isArray(parts)) return parts;

  if (typeof parts === "string") {
    try {
      const parsed = JSON.parse(parts);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function buildWorkshopReceiptText(job = {}) {
  const parts = normaliseParts(job.parts_json);
  const lines = [];

  const totalPrice =
    job.price !== null && job.price !== undefined && job.price !== ""
      ? toNumber(job.price)
      : toNumber(job.labour_cost) + toNumber(job.parts_cost);

  lines.push(centerText("THE NERD HERD"));
  lines.push(centerText("WORKSHOP HUB"));
  lines.push(centerText("JOB RECEIPT"));
  lines.push(divider("="));

  if (job.job_number) lines.push(leftRight("Job No", safe(job.job_number)));
  if (job.created_at) lines.push(leftRight("Created", formatDateTime(job.created_at)));
  if (job.updated_at) lines.push(leftRight("Updated", formatDateTime(job.updated_at)));

  lines.push(divider("-"));

  lines.push("CUSTOMER");
  if (job.customer_name) wrapText(`Name: ${job.customer_name}`).forEach((line) => lines.push(line));
  if (job.customer_phone) wrapText(`Phone: ${job.customer_phone}`).forEach((line) => lines.push(line));
  if (job.customer_email) wrapText(`Email: ${job.customer_email}`).forEach((line) => lines.push(line));

  lines.push(divider("-"));

  lines.push("DEVICE");
  if (job.device_type) wrapText(`Type: ${job.device_type}`).forEach((line) => lines.push(line));
  if (job.brand) wrapText(`Brand: ${job.brand}`).forEach((line) => lines.push(line));
  if (job.model) wrapText(`Model: ${job.model}`).forEach((line) => lines.push(line));
  if (job.serial_number) wrapText(`Serial: ${job.serial_number}`).forEach((line) => lines.push(line));
  if (job.status) wrapText(`Status: ${job.status}`).forEach((line) => lines.push(line));

  lines.push(divider("-"));

  lines.push("FAULT / WORK");
  if (job.fault) {
    wrapText(job.fault).forEach((line) => lines.push(line));
  } else {
    lines.push("No fault description");
  }

  if (job.notes) {
    lines.push(blank());
    lines.push("NOTES");
    wrapText(job.notes).forEach((line) => lines.push(line));
  }

  if (parts.length > 0) {
    lines.push(divider("-"));
    lines.push("PARTS");

    parts.forEach((part, index) => {
      const name =
        safe(part?.name) ||
        safe(part?.part_name) ||
        safe(part?.description) ||
        `Part ${index + 1}`;

      const qty =
        part?.qty !== undefined && part?.qty !== null && part?.qty !== ""
          ? `x${part.qty}`
          : "";

      const priceValue =
        part?.price !== undefined && part?.price !== null && part?.price !== ""
          ? money(part.price)
          : "";

      const label = qty ? `${name} ${qty}` : name;
      const wrapped = wrapText(label, priceValue ? POS_LINE_WIDTH - priceValue.length - 1 : POS_LINE_WIDTH);

      if (wrapped.length === 0) return;

      if (priceValue) {
        lines.push(leftRight(wrapped[0], priceValue));
        wrapped.slice(1).forEach((line) => lines.push(line));
      } else {
        wrapped.forEach((line) => lines.push(line));
      }
    });
  }

  lines.push(divider("-"));
  lines.push("TOTALS");
  lines.push(leftRight("Labour", money(job.labour_cost)));
  lines.push(leftRight("Parts", money(job.parts_cost)));
  lines.push(leftRight("Total", money(totalPrice)));

  lines.push(divider("="));
  lines.push(centerText("Thank you for supporting"));
  lines.push(centerText("The Nerd Herd"));
  lines.push(blank());
  lines.push(blank());
  lines.push(blank());

  return lines.join("\n");
}

function printTextViaPos(text) {
  const payload = safe(text);
  if (!payload) {
    throw new Error("Nothing to print.");
  }

  const url = `tnhprinter://print?text=${encodeURIComponent(payload)}`;
  window.location.href = url;
}

export {
  POS_LINE_WIDTH,
  money,
  safe,
  wrapText,
  leftRight,
  centerText,
  divider,
  formatDateTime,
  buildWorkshopReceiptText,
  printTextViaPos,
};