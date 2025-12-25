import React from "react";
import { FaEdit, FaTrash, FaEye, FaDownload } from "react-icons/fa";

function CommonTable({
  title,
  columns = [], // [{ label, accessor }]
  data = [],
  actions = [],
  renderRow,
}) {
  return (
    <div className='px-4'>
      <div className='bg-white rounded-2xl shadow-lg p-5'>
        <h1 className='text-xl font-semibold text-gray-800 mb-4'>{title}</h1>

        <div className='overflow-x-auto'>
          <table className='w-full text-left border-separate border-spacing-y-2'>
            {/* TABLE HEAD */}
            <thead className='bg-gray-200 text-gray-600 uppercase text-sm'>
              <tr>
                {columns.map((col, index) => (
                  <th key={index} className='px-6 py-3 text-center'>
                    {col.label}
                  </th>
                ))}

                {actions.length > 0 && (
                  <th className='px-6 py-3 text-center'>Actions</th>
                )}
              </tr>
            </thead>

            {/* TABLE BODY */}
            <tbody className='text-gray-800 text-sm'>
              {data.length > 0 ? (
                renderRow ? (
                  data.map((row, index) => renderRow(row, index))
                ) : (
                  data.map((row, rowIndex) => (
                    <tr
                      key={row.id || rowIndex}
                      className={
                        rowIndex % 2 === 0 ? "bg-blue-100" : "bg-orange-200"
                      }>
                      {columns.map((col, colIndex) => (
                        <td
                          key={colIndex}
                          className='px-6 py-4 font-medium text-center'>
                          {row[col.accessor] ?? "-"}
                        </td>
                      ))}

                      {actions.length > 0 && (
                        <td className='px-6 py-4 flex gap-4 justify-center'>
                          {actions.includes("view") && (
                            <button onClick={() => row.onView?.(row)}>
                              <FaEye />
                            </button>
                          )}
                          {actions.includes("edit") && (
                            <button onClick={() => row.onEdit?.(row)}>
                              <FaEdit />
                            </button>
                          )}
                          {actions.includes("delete") && (
                            <button onClick={() => row.onDelete?.(row)}>
                              <FaTrash />
                            </button>
                          )}
                          {actions.includes("download") && (
                            <button onClick={() => row.onDownload?.(row)}>
                              <FaDownload />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )
              ) : (
                <tr>
                  <td
                    colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                    className='text-center py-4 text-gray-500'>
                    No data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CommonTable;
