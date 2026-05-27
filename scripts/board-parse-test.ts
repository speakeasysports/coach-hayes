/**
 * One-off sanity test for the board CSV parser. Run with:
 *   npx tsx scripts/board-parse-test.ts
 */
import { parseBoardCsv } from "../lib/board/sheet";

const csv = `Published,Position,Player Name,Class,Star Rating,Height,Weight,High School,Status,Committed Team,Video URL
TRUE,QB,Jaxon Dollar,2027,4,"6'3""",195,Buford HS,Uncommitted,,https://youtu.be/dQw4w9WgXcQ
TRUE,WR,Nick Peal,2027,3,"5'11""",180,Mill Creek HS,Committed,Georgia,https://www.youtube.com/watch?v=jNQXAC9IVRw
FALSE,RB,Hidden Recruit,2027,5,"6'0""",200,Some HS,Committed,Auburn,
TRUE,QB,Bad Year,9999,4,"6'2""",190,Some HS,Uncommitted,,
TRUE,WR,No Team Committed,2027,4,"6'1""",190,Some HS,Committed,,
TRUE,WR,Bad Video URL,2027,4,"6'1""",190,Some HS,Committed,Georgia,not-a-youtube-url
,,,,,,,,,,
`;

const result = parseBoardCsv(csv);
console.log(JSON.stringify(result, null, 2));
